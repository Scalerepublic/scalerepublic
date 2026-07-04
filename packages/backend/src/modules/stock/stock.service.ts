import { and, asc, desc, eq, gte, inArray, lte, ne, or, type SQL } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockDailyBar, stockPrice } from '../../db/schema/stock/index.ts'
import {
    DEBUG_MARKET_CRASH_SOURCE,
    DEBUG_MARKET_PRICE_SOURCE,
    isMarketDebugEnabled,
} from '../../lib/market-debug.ts'

const HISTORY_DAYS = 30
const MAX_DAILY_BAR_FETCHES = 30

export type StockSummary = {
    id: string
    ticker: string
    companyName: string
    exchange: string
    currency: string
    latestPrice: number | null
    previousClose: number | null
    dayChange: number | null
    dayChangePercent: number | null
    periodChangePercent: number | null
}

export type StockDetailPerformance = {
    latestPrice: number | null
    previousClose: number | null
    dayChange: number | null
    dayChangePercent: number | null
    periodChangePercent: number | null
}

export type StockDetail = {
    stock: {
        id: string
        ticker: string
        companyName: string
        exchange: string
        currency: string
        description: string | null
        isAccumulating: boolean | null
    }
    performance: StockDetailPerformance
    priceHistory: Array<{ date: string; close: number }>
}

export class StockService {
    constructor(private readonly ctx: AppVars) { }

    private get marketDb() {
        return this.ctx.marketDb ?? this.ctx.db
    }

    private usesSeparateMarketDb(): boolean {
        return this.ctx.marketDb !== undefined
    }

    private canWriteMarketData(): boolean {
        return !this.usesSeparateMarketDb()
    }

    private async resolveMarketStockIds(appStockIds: string[]): Promise<Map<string, string>> {
        if (!this.usesSeparateMarketDb()) {
            return new Map(appStockIds.map((id) => [id, id]))
        }

        const tickers = await this.getTickersByStockIds(appStockIds)
        const tickerList = [...new Set(tickers.values())]
        if (tickerList.length === 0) {
            return new Map()
        }

        const marketRows = await this.marketDb
            .select({ id: stock.id, ticker: stock.ticker })
            .from(stock)
            .where(inArray(stock.ticker, tickerList))

        const marketIdByTicker = new Map(marketRows.map((row) => [row.ticker, row.id]))
        const result = new Map<string, string>()
        for (const appId of appStockIds) {
            const ticker = tickers.get(appId)
            if (ticker === undefined) continue
            const marketId = marketIdByTicker.get(ticker)
            if (marketId !== undefined) {
                result.set(appId, marketId)
            }
        }
        return result
    }

    private async getMarketMetricsByTickers(
        tickers: string[],
    ): Promise<Map<string, { periodChangePercent: string | null; dayChangePercent: string | null }>> {
        if (tickers.length === 0) {
            return new Map()
        }

        const rows = await this.marketDb
            .select({
                ticker: stock.ticker,
                periodChangePercent: stock.periodChangePercent,
                dayChangePercent: stock.dayChangePercent,
            })
            .from(stock)
            .where(inArray(stock.ticker, tickers))

        return new Map(rows.map((row) => [row.ticker, {
            periodChangePercent: row.periodChangePercent,
            dayChangePercent: row.dayChangePercent,
        }]))
    }

    private priceSourceFilter(): SQL {
        if (isMarketDebugEnabled()) {
            return or(
                eq(stockPrice.source, DEBUG_MARKET_PRICE_SOURCE),
                eq(stockPrice.source, DEBUG_MARKET_CRASH_SOURCE),
            )!
        }
        return and(
            ne(stockPrice.source, DEBUG_MARKET_PRICE_SOURCE),
            ne(stockPrice.source, DEBUG_MARKET_CRASH_SOURCE),
        )!
    }

    private asOfFilter(asOf?: Date): SQL | undefined {
        const effectiveAsOf =
            asOf ?? (isMarketDebugEnabled() ? this.ctx.marketDebugService.getAsOf() : undefined)
        return effectiveAsOf ? lte(stockPrice.recordedAt, effectiveAsOf) : undefined
    }

    private priceFilters(asOf?: Date): SQL[] {
        const filters: SQL[] = [this.priceSourceFilter()]
        const asOfClause = this.asOfFilter(asOf)
        if (asOfClause) filters.push(asOfClause)
        return filters
    }

    private previousDayEnd(): Date {
        if (isMarketDebugEnabled()) {
            const d = this.ctx.marketDebugService.getMarketDate()
            d.setUTCDate(d.getUTCDate() - 1)
            d.setUTCHours(23, 59, 59, 999)
            return d
        }
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - 1)
        d.setUTCHours(23, 59, 59, 999)
        return d
    }

    private computePerformanceMetrics(
        latestPrice: number | null,
        priceHistory: Array<{ date: string; close: number }>,
        priceTablePreviousClose: number | null,
    ): StockDetailPerformance {
        const lastBarClose = priceHistory.at(-1)?.close ?? null
        const prevBarClose = priceHistory.length >= 2 ? priceHistory.at(-2)?.close ?? null : null
        const firstClose = priceHistory[0]?.close ?? null
        const effectiveLatest = latestPrice ?? lastBarClose

        let previousClose = priceTablePreviousClose
        let dayChange: number | null = null
        let dayChangePercent: number | null = null

        if (prevBarClose !== null && effectiveLatest !== null) {
            previousClose = prevBarClose
            dayChange = effectiveLatest - prevBarClose
            dayChangePercent = prevBarClose > 0 ? (dayChange / prevBarClose) * 100 : null
        } else if (effectiveLatest !== null && priceTablePreviousClose !== null) {
            previousClose = priceTablePreviousClose
            dayChange = effectiveLatest - priceTablePreviousClose
            dayChangePercent =
                priceTablePreviousClose > 0 ? (dayChange / priceTablePreviousClose) * 100 : null
        }

        const periodChangePercent =
            effectiveLatest !== null && firstClose !== null && firstClose > 0
                ? ((effectiveLatest - firstClose) / firstClose) * 100
                : null

        return {
            latestPrice: effectiveLatest,
            previousClose,
            dayChange,
            dayChangePercent,
            periodChangePercent,
        }
    }

    private async getDailyBarHistoriesByStockIds(
        stockIds: string[],
        days: number,
    ): Promise<Map<string, Array<{ date: string; close: number }>>> {
        if (stockIds.length === 0) {
            return new Map()
        }

        const idMap = await this.resolveMarketStockIds(stockIds)
        const marketIds = [...new Set(idMap.values())]
        if (marketIds.length === 0) {
            return new Map()
        }

        const marketToApp = new Map<string, string>()
        for (const [appId, marketId] of idMap) {
            marketToApp.set(marketId, appId)
        }

        const fromDate = this.formatUtcDate(this.addUtcDays(new Date(), -(days - 1)))

        const rows = await this.marketDb
            .select({
                stockId: stockDailyBar.stockId,
                tradingDate: stockDailyBar.tradingDate,
                close: stockDailyBar.close,
            })
            .from(stockDailyBar)
            .where(and(
                inArray(stockDailyBar.stockId, marketIds),
                gte(stockDailyBar.tradingDate, fromDate),
            ))
            .orderBy(asc(stockDailyBar.tradingDate))

        const histories = new Map<string, Array<{ date: string; close: number }>>()
        for (const row of rows) {
            const appId = marketToApp.get(row.stockId)
            if (appId === undefined) continue
            const history = histories.get(appId) ?? []
            history.push({
                date: row.tradingDate,
                close: parseFloat(row.close),
            })
            histories.set(appId, history)
        }

        return histories
    }

    private parsePersistedMetric(value: string | null | undefined): number | null {
        if (value === null || value === undefined) return null
        const parsed = parseFloat(value)
        return Number.isFinite(parsed) ? parsed : null
    }

    private async persistStockMetrics(
        stockId: string,
        performance: StockDetailPerformance,
    ): Promise<void> {
        if (!this.canWriteMarketData()) {
            return
        }

        await this.ctx.db.update(stock).set({
            periodChangePercent:
                performance.periodChangePercent !== null
                    ? performance.periodChangePercent.toString()
                    : null,
            dayChangePercent:
                performance.dayChangePercent !== null
                    ? performance.dayChangePercent.toString()
                    : null,
            metricsUpdatedAt: new Date(),
        }).where(eq(stock.id, stockId))
    }

    private buildSummaryPerformance(
        latestPrice: number | null,
        priceTablePreviousClose: number | null,
        priceHistory: Array<{ date: string; close: number }>,
        persisted: {
            periodChangePercent: string | null
            dayChangePercent: string | null
        },
    ): Pick<
        StockSummary,
        'latestPrice' | 'previousClose' | 'dayChange' | 'dayChangePercent' | 'periodChangePercent'
    > {
        const computed = this.computePerformanceMetrics(
            latestPrice,
            priceHistory,
            priceTablePreviousClose,
        )
        const persistedPeriod = this.parsePersistedMetric(persisted.periodChangePercent)
        const persistedDay = this.parsePersistedMetric(persisted.dayChangePercent)

        return {
            latestPrice: computed.latestPrice,
            previousClose: computed.previousClose,
            dayChange: computed.dayChange,
            dayChangePercent: persistedDay ?? computed.dayChangePercent,
            periodChangePercent: persistedPeriod ?? computed.periodChangePercent,
        }
    }

    async refreshStockMetrics(stockId: string): Promise<void> {
        const latestPrice = await this.getLatestPriceByStockId(stockId)
        const priceTablePreviousClose = await this.getLatestPriceByStockId(
            stockId,
            this.previousDayEnd(),
        )
        const priceHistory = await this.getCachedDailyBarHistory(stockId, HISTORY_DAYS)
        const performance = this.computePerformanceMetrics(
            latestPrice,
            priceHistory,
            priceTablePreviousClose,
        )

        if (
            performance.periodChangePercent === null
            && performance.dayChangePercent === null
        ) {
            return
        }

        await this.persistStockMetrics(stockId, performance)
    }

    async getAll(): Promise<StockSummary[]> {
        const rows = await this.ctx.db
            .select({
                id: stock.id,
                ticker: stock.ticker,
                companyName: stock.companyName,
                exchange: stock.exchange,
                currency: stock.currency,
                periodChangePercent: stock.periodChangePercent,
                dayChangePercent: stock.dayChangePercent,
            })
            .from(stock)
            .where(eq(stock.isActive, true))

        const marketMetrics = this.usesSeparateMarketDb()
            ? await this.getMarketMetricsByTickers(rows.map((row) => row.ticker))
            : null

        const rowsWithMetrics = rows.map((row) => {
            if (marketMetrics === null) {
                return row
            }
            const metrics = marketMetrics.get(row.ticker)
            if (metrics === undefined) {
                return row
            }
            return {
                ...row,
                periodChangePercent: metrics.periodChangePercent,
                dayChangePercent: metrics.dayChangePercent,
            }
        })

        const rowsNeedingFallback = rowsWithMetrics.filter((row) => {
            const persistedPeriod = this.parsePersistedMetric(row.periodChangePercent)
            const persistedDay = this.parsePersistedMetric(row.dayChangePercent)
            return persistedPeriod === null && persistedDay === null
        })

        const fallbackIds = rowsNeedingFallback.map((row) => row.id)
        const appStockIds = rowsWithMetrics.map((row) => row.id)
        const previousDayEnd = this.previousDayEnd()

        const [latestPrices, dailyBarHistories, previousCloses] = await Promise.all([
            this.getLatestPricesByStockIds(appStockIds),
            fallbackIds.length > 0
                ? this.getDailyBarHistoriesByStockIds(fallbackIds, HISTORY_DAYS)
                : Promise.resolve(new Map<string, Array<{ date: string; close: number }>>()),
            fallbackIds.length > 0
                ? this.getLatestPricesByStockIds(fallbackIds, previousDayEnd)
                : Promise.resolve(new Map<string, number>()),
        ])

        return rowsWithMetrics.map((r) => {
            const latestPrice = latestPrices.get(r.id) ?? null
            const persistedPeriod = this.parsePersistedMetric(r.periodChangePercent)
            const persistedDay = this.parsePersistedMetric(r.dayChangePercent)
            const priceTablePreviousClose = previousCloses.get(r.id) ?? null
            const priceHistory =
                persistedPeriod === null && persistedDay === null
                    ? dailyBarHistories.get(r.id) ?? []
                    : []
            const performance = this.buildSummaryPerformance(
                latestPrice,
                priceTablePreviousClose,
                priceHistory,
                {
                    periodChangePercent: r.periodChangePercent,
                    dayChangePercent: r.dayChangePercent,
                },
            )

            return {
                id: r.id,
                ticker: r.ticker,
                companyName: r.companyName,
                exchange: r.exchange,
                currency: r.currency,
                latestPrice: performance.latestPrice,
                previousClose: performance.previousClose,
                dayChange: performance.dayChange,
                dayChangePercent: performance.dayChangePercent,
                periodChangePercent: performance.periodChangePercent,
            }
        })
    }

    async getPriceHistory(
        ticker: string,
        from: Date,
        to: Date,
    ): Promise<Array<{ recordedAt: Date; price: number }> | null> {
        const [stockRow] = await this.ctx.db
            .select({ id: stock.id })
            .from(stock)
            .where(eq(stock.ticker, ticker))
            .limit(1)

        if (!stockRow) return null

        const idMap = await this.resolveMarketStockIds([stockRow.id])
        const marketStockId = idMap.get(stockRow.id)
        if (marketStockId === undefined) return null

        const rows = await this.marketDb
            .select({ recordedAt: stockPrice.recordedAt, price: stockPrice.price })
            .from(stockPrice)
            .where(and(
                eq(stockPrice.stockId, marketStockId),
                this.priceSourceFilter(),
                gte(stockPrice.recordedAt, from),
                lte(stockPrice.recordedAt, to),
            ))
            .orderBy(asc(stockPrice.recordedAt))

        return rows.map(r => ({ recordedAt: r.recordedAt, price: parseFloat(r.price) }))
    }

    calculateTotal(symbol: string, quantity: number, price: number) {
        return { symbol, quantity, price, total: quantity * price }
    }

    async getStockId(ticker: string): Promise<string | null> {
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]?.id ?? null
    }

    async getTicker(stockId: string): Promise<string | null> {
        const tickers = await this.getTickersByStockIds([stockId])
        return tickers.get(stockId) ?? null
    }

    async getTickersByStockIds(stockIds: string[]): Promise<Map<string, string>> {
        if (stockIds.length === 0) {
            return new Map()
        }

        const rows = await this.ctx.db
            .select({ id: stock.id, ticker: stock.ticker })
            .from(stock)
            .where(inArray(stock.id, stockIds))

        return new Map(rows.map((row) => [row.id, row.ticker]))
    }

    async createStock(ticker: string, companyName: string, exchange: string, currency: string): Promise<string> {
        const id = crypto.randomUUID()
        await this.ctx.db.insert(stock).values({ id, ticker, companyName, exchange, currency, isActive: true }).onConflictDoNothing()
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]!.id
    }

    async getLatestPriceByStockId(stockId: string, asOf?: Date): Promise<number | null> {
        const prices = await this.getLatestPricesByStockIds([stockId], asOf)
        return prices.get(stockId) ?? null
    }

    async getLatestPricesByStockIds(
        stockIds: string[],
        asOf?: Date,
    ): Promise<Map<string, number>> {
        if (stockIds.length === 0) {
            return new Map()
        }

        const idMap = await this.resolveMarketStockIds(stockIds)
        const marketIds = [...new Set(idMap.values())]
        if (marketIds.length === 0) {
            return new Map()
        }

        const rows = await this.marketDb
            .selectDistinctOn([stockPrice.stockId], {
                stockId: stockPrice.stockId,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(inArray(stockPrice.stockId, marketIds), ...this.priceFilters(asOf)))
            .orderBy(stockPrice.stockId, desc(stockPrice.recordedAt))

        const marketPrices = new Map(rows.map((row) => [row.stockId, parseFloat(row.price)]))
        const result = new Map<string, number>()
        for (const appId of stockIds) {
            const marketId = idMap.get(appId)
            if (marketId === undefined) continue
            const price = marketPrices.get(marketId)
            if (price !== undefined) {
                result.set(appId, price)
            }
        }
        return result
    }

    async getPriceSnapshotsByStockIds(
        stockIds: string[],
        from: Date,
        to: Date,
    ): Promise<Map<string, Array<{ recordedAt: Date; price: number }>>> {
        if (stockIds.length === 0) {
            return new Map()
        }

        const idMap = await this.resolveMarketStockIds(stockIds)
        const marketIds = [...new Set(idMap.values())]
        if (marketIds.length === 0) {
            return new Map()
        }

        const rows = await this.marketDb
            .select({
                stockId: stockPrice.stockId,
                recordedAt: stockPrice.recordedAt,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(
                inArray(stockPrice.stockId, marketIds),
                gte(stockPrice.recordedAt, from),
                lte(stockPrice.recordedAt, to),
                ...this.priceFilters(),
            ))
            .orderBy(asc(stockPrice.recordedAt))

        const marketToApp = new Map<string, string>()
        for (const [appId, marketId] of idMap) {
            marketToApp.set(marketId, appId)
        }

        const snapshots = new Map<string, Array<{ recordedAt: Date; price: number }>>()
        for (const row of rows) {
            const appId = marketToApp.get(row.stockId)
            if (appId === undefined) continue
            const series = snapshots.get(appId) ?? []
            series.push({
                recordedAt: row.recordedAt,
                price: parseFloat(row.price),
            })
            snapshots.set(appId, series)
        }

        return snapshots
    }

    async insertPrice(stockId: string, price: number, source: string, recordedAt: Date): Promise<void> {
        if (!this.canWriteMarketData()) {
            return
        }

        await this.ctx.db.insert(stockPrice).values({
            id: crypto.randomUUID(),
            stockId,
            price: price.toString(),
            source,
            recordedAt,
        }).onConflictDoNothing()
    }

    async upsertDailyBar(
        stockId: string,
        bar: { tradingDate: string; open: number; high: number; low: number; close: number },
        source: string,
    ): Promise<void> {
        if (!this.canWriteMarketData()) {
            return
        }

        await this.ctx.db.insert(stockDailyBar).values({
            id: crypto.randomUUID(),
            stockId,
            tradingDate: bar.tradingDate,
            open: bar.open.toString(),
            high: bar.high.toString(),
            low: bar.low.toString(),
            close: bar.close.toString(),
            source,
        }).onConflictDoUpdate({
            target: [stockDailyBar.stockId, stockDailyBar.tradingDate],
            set: {
                open: bar.open.toString(),
                high: bar.high.toString(),
                low: bar.low.toString(),
                close: bar.close.toString(),
                source,
            },
        })
    }

    private formatUtcDate(date: Date): string {
        return date.toISOString().slice(0, 10)
    }

    private buildPlaceholderDescription(companyName: string): string {
        return `this stock (${companyName}) is good because i like it`
    }

    private addUtcDays(date: Date, days: number): Date {
        const next = new Date(date)
        next.setUTCDate(next.getUTCDate() + days)
        return next
    }

    private async ensureStockMetadata(
        stockRow: typeof stock.$inferSelect,
    ): Promise<typeof stock.$inferSelect> {
        if (stockRow.description !== null && stockRow.description !== '') {
            return stockRow
        }

        const companyName = stockRow.companyName
        const description = this.buildPlaceholderDescription(companyName) // TODO, GET REAL DESCRIPTION

        if (stockRow.companyName !== stockRow.ticker) {
            await this.ctx.db
                .update(stock)
                .set({ description })
                .where(eq(stock.id, stockRow.id))
            return { ...stockRow, description }
        }

        const meta = await this.ctx.stockDataClient.getStockMeta(stockRow.ticker)
        const resolvedName = meta?.name ?? companyName
        const resolvedDescription = this.buildPlaceholderDescription(resolvedName) // TODO, GET REAL DESCRIPTION
        await this.ctx.db
            .update(stock)
            .set({
                companyName: resolvedName,
                description: resolvedDescription,
            })
            .where(eq(stock.id, stockRow.id))

        return {
            ...stockRow,
            companyName: resolvedName,
            description: resolvedDescription,
        }
    }

    private async cacheMissingDailyBars(
        stockId: string,
        ticker: string,
        days: number,
        maxFetches = MAX_DAILY_BAR_FETCHES,
    ): Promise<void> {
        if (!this.canWriteMarketData()) {
            return
        }

        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        const fromDate = this.formatUtcDate(this.addUtcDays(today, -(days - 1)))

        const existingRows = await this.ctx.db
            .select({ tradingDate: stockDailyBar.tradingDate })
            .from(stockDailyBar)
            .where(and(
                eq(stockDailyBar.stockId, stockId),
                gte(stockDailyBar.tradingDate, fromDate),
            ))

        const existingDates = new Set(existingRows.map((row) => row.tradingDate))

        let attempts = 0
        for (let offset = 0; offset < days && attempts < maxFetches; offset += 1) {
            const tradingDate = this.formatUtcDate(this.addUtcDays(today, -offset))

            if (existingDates.has(tradingDate)) continue

            attempts += 1
            const bar = await this.ctx.stockDataClient.getDailyBar(ticker, this.addUtcDays(today, -offset))
            if (bar === null) continue
            await this.ctx.db.insert(stockDailyBar).values({
                id: crypto.randomUUID(),
                stockId,
                tradingDate,
                open: bar.open.toString(),
                high: bar.high.toString(),
                low: bar.low.toString(),
                close: bar.close.toString(),
                source: this.ctx.stockDataClient.source,
            }).onConflictDoNothing()
            existingDates.add(tradingDate)
        }
    }

    private async getCachedDailyBarHistory(
        stockId: string,
        days: number,
    ): Promise<Array<{ date: string; close: number }>> {
        const histories = await this.getDailyBarHistoriesByStockIds([stockId], days)
        return histories.get(stockId) ?? []
    }

    async ensureDailyBarHistory(
        stockId: string,
        ticker: string,
        days = HISTORY_DAYS,
        maxFetchesPerCall = MAX_DAILY_BAR_FETCHES,
    ): Promise<void> {
        let history = await this.getCachedDailyBarHistory(stockId, days)
        let passes = 0

        while (history.length < days && passes < 4) {
            await this.cacheMissingDailyBars(stockId, ticker, days, maxFetchesPerCall)
            history = await this.getCachedDailyBarHistory(stockId, days)
            passes += 1
        }
    }

    private async getChartPriceHistory(
        stockId: string,
        ticker: string,
        days: number,
    ): Promise<Array<{ date: string; close: number }>> {
        const fromDate = this.formatUtcDate(this.addUtcDays(new Date(), -(days - 1)))
        const dailyBars = await this.getCachedDailyBarHistory(stockId, days)
        const closeByDate = new Map(dailyBars.map((bar) => [bar.date, bar.close]))

        const from = this.addUtcDays(new Date(), -(days - 1))
        const priceRows = await this.getPriceHistory(ticker, from, new Date()) ?? []

        for (const row of priceRows) {
            const date = this.formatUtcDate(row.recordedAt)
            if (date < fromDate) continue
            closeByDate.set(date, row.price)
        }

        return [...closeByDate.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([date, close]) => ({ date, close }))
    }

    async getStockDetail(ticker: string, historyDays = HISTORY_DAYS): Promise<StockDetail | null> {
        const [stockRow] = await this.ctx.db
            .select()
            .from(stock)
            .where(eq(stock.ticker, ticker))
            .limit(1)

        if (!stockRow) return null

        const enrichedStock = await this.ensureStockMetadata(stockRow)

        const priceHistory = await this.getChartPriceHistory(
            enrichedStock.id,
            enrichedStock.ticker,
            historyDays,
        )

        const latestPrice = await this.getLatestPriceByStockId(enrichedStock.id)
        const priceTablePreviousClose = await this.getLatestPriceByStockId(
            enrichedStock.id,
            this.previousDayEnd(),
        )

        const metricsHistory = priceHistory.slice(-HISTORY_DAYS)
        const computed = this.computePerformanceMetrics(
            latestPrice,
            metricsHistory,
            priceTablePreviousClose,
        )

        let persistedPeriod: number | null = this.parsePersistedMetric(stockRow.periodChangePercent)
        let persistedDay: number | null = this.parsePersistedMetric(stockRow.dayChangePercent)
        if (this.usesSeparateMarketDb()) {
            const marketMetrics = await this.getMarketMetricsByTickers([enrichedStock.ticker])
            const metrics = marketMetrics.get(enrichedStock.ticker)
            if (metrics !== undefined) {
                persistedPeriod = this.parsePersistedMetric(metrics.periodChangePercent)
                persistedDay = this.parsePersistedMetric(metrics.dayChangePercent)
            }
        }

        const performance: StockDetailPerformance = {
            ...computed,
            dayChangePercent: persistedDay ?? computed.dayChangePercent,
            periodChangePercent: persistedPeriod ?? computed.periodChangePercent,
        }

        return {
            stock: {
                id: enrichedStock.id,
                ticker: enrichedStock.ticker,
                companyName: enrichedStock.companyName,
                exchange: enrichedStock.exchange,
                currency: enrichedStock.currency,
                description: this.buildPlaceholderDescription(enrichedStock.companyName),
                isAccumulating: enrichedStock.isAccumulating,
            },
            performance,
            priceHistory,
        }
    }
}
