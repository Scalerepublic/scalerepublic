import { and, asc, desc, eq, gte, inArray, lte, ne, or, type SQL } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockDailyBar, stockPrice } from '../../db/schema/stock/index.ts'
import {
    DEBUG_MARKET_CRASH_SOURCE,
    DEBUG_MARKET_PRICE_SOURCE,
    isMarketDebugEnabled,
} from '../../lib/market-debug.ts'

const HISTORY_DAYS = 30
const MAX_DAILY_BAR_FETCHES = 10
const DETAIL_DAILY_BAR_FETCHES = 30
const MIN_BARS_FOR_METRICS = 2

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

        const fromDate = this.formatUtcDate(this.addUtcDays(new Date(), -(days - 1)))

        const rows = await this.ctx.db
            .select({
                stockId: stockDailyBar.stockId,
                tradingDate: stockDailyBar.tradingDate,
                close: stockDailyBar.close,
            })
            .from(stockDailyBar)
            .where(and(
                inArray(stockDailyBar.stockId, stockIds),
                gte(stockDailyBar.tradingDate, fromDate),
            ))
            .orderBy(asc(stockDailyBar.tradingDate))

        const histories = new Map<string, Array<{ date: string; close: number }>>()
        for (const row of rows) {
            const history = histories.get(row.stockId) ?? []
            history.push({
                date: row.tradingDate,
                close: parseFloat(row.close),
            })
            histories.set(row.stockId, history)
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
        const filters = this.priceFilters()
        const latestPricePerStock = this.ctx.db
            .selectDistinctOn([stockPrice.stockId], {
                stockId: stockPrice.stockId,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(...filters))
            .orderBy(stockPrice.stockId, desc(stockPrice.recordedAt))
            .as('latest_price')

        const rows = await this.ctx.db
            .select({
                id: stock.id,
                ticker: stock.ticker,
                companyName: stock.companyName,
                exchange: stock.exchange,
                currency: stock.currency,
                latestPrice: latestPricePerStock.price,
                periodChangePercent: stock.periodChangePercent,
                dayChangePercent: stock.dayChangePercent,
            })
            .from(stock)
            .leftJoin(latestPricePerStock, eq(stock.id, latestPricePerStock.stockId))
            .where(eq(stock.isActive, true))

        const rowsNeedingFallback = rows.filter((row) => {
            const persistedPeriod = this.parsePersistedMetric(row.periodChangePercent)
            const persistedDay = this.parsePersistedMetric(row.dayChangePercent)
            return persistedPeriod === null && persistedDay === null
        })

        const fallbackIds = rowsNeedingFallback.map((row) => row.id)
        const previousDayEnd = this.previousDayEnd()

        const [dailyBarHistories, previousCloses] = await Promise.all([
            fallbackIds.length > 0
                ? this.getDailyBarHistoriesByStockIds(fallbackIds, HISTORY_DAYS)
                : Promise.resolve(new Map<string, Array<{ date: string; close: number }>>()),
            fallbackIds.length > 0
                ? this.getLatestPricesByStockIds(fallbackIds, previousDayEnd)
                : Promise.resolve(new Map<string, number>()),
        ])

        return rows.map((r) => {
            const latestPrice = r.latestPrice !== null ? parseFloat(r.latestPrice) : null
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

        const rows = await this.ctx.db
            .select({ recordedAt: stockPrice.recordedAt, price: stockPrice.price })
            .from(stockPrice)
            .where(and(
                eq(stockPrice.stockId, stockRow.id),
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

        const rows = await this.ctx.db
            .selectDistinctOn([stockPrice.stockId], {
                stockId: stockPrice.stockId,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(inArray(stockPrice.stockId, stockIds), ...this.priceFilters(asOf)))
            .orderBy(stockPrice.stockId, desc(stockPrice.recordedAt))

        return new Map(rows.map((row) => [row.stockId, parseFloat(row.price)]))
    }

    async getPriceSnapshotsByStockIds(
        stockIds: string[],
        from: Date,
        to: Date,
    ): Promise<Map<string, Array<{ recordedAt: Date; price: number }>>> {
        if (stockIds.length === 0) {
            return new Map()
        }

        const rows = await this.ctx.db
            .select({
                stockId: stockPrice.stockId,
                recordedAt: stockPrice.recordedAt,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(
                inArray(stockPrice.stockId, stockIds),
                gte(stockPrice.recordedAt, from),
                lte(stockPrice.recordedAt, to),
                ...this.priceFilters(),
            ))
            .orderBy(asc(stockPrice.recordedAt))

        const snapshots = new Map<string, Array<{ recordedAt: Date; price: number }>>()
        for (const row of rows) {
            const series = snapshots.get(row.stockId) ?? []
            series.push({
                recordedAt: row.recordedAt,
                price: parseFloat(row.price),
            })
            snapshots.set(row.stockId, series)
        }

        return snapshots
    }

    async insertPrice(stockId: string, price: number, source: string, recordedAt: Date): Promise<void> {
        await this.ctx.db.insert(stockPrice).values({
            id: crypto.randomUUID(),
            stockId,
            price: price.toString(),
            source,
            recordedAt,
        }).onConflictDoNothing()
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
        const fromDate = this.formatUtcDate(this.addUtcDays(new Date(), -(days - 1)))

        const rows = await this.ctx.db
            .select({
                tradingDate: stockDailyBar.tradingDate,
                close: stockDailyBar.close,
            })
            .from(stockDailyBar)
            .where(and(
                eq(stockDailyBar.stockId, stockId),
                gte(stockDailyBar.tradingDate, fromDate),
            ))
            .orderBy(asc(stockDailyBar.tradingDate))

        return rows.map((row) => ({
            date: row.tradingDate,
            close: parseFloat(row.close),
        }))
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

    private async ensureDetailDailyBarHistory(stockId: string, ticker: string, days: number): Promise<void> {
        await this.ensureDailyBarHistory(stockId, ticker, days, DETAIL_DAILY_BAR_FETCHES)
    }

    async getStockDetail(ticker: string, historyDays = HISTORY_DAYS): Promise<StockDetail | null> {
        const [stockRow] = await this.ctx.db
            .select()
            .from(stock)
            .where(eq(stock.ticker, ticker))
            .limit(1)

        if (!stockRow) return null

        const enrichedStock = await this.ensureStockMetadata(stockRow)

        await this.ensureDetailDailyBarHistory(enrichedStock.id, enrichedStock.ticker, historyDays)
        let priceHistory = await this.getCachedDailyBarHistory(enrichedStock.id, historyDays)

        const latestPrice = await this.getLatestPriceByStockId(enrichedStock.id)
        const priceTablePreviousClose = await this.getLatestPriceByStockId(
            enrichedStock.id,
            this.previousDayEnd(),
        )

        if (priceHistory.length === 0) {
            const from = this.addUtcDays(new Date(), -(historyDays - 1))
            const fallback = await this.getPriceHistory(ticker, from, new Date())
            priceHistory = (fallback ?? []).map((point) => ({
                date: this.formatUtcDate(point.recordedAt),
                close: point.price,
            }))
        }

        const performance = this.computePerformanceMetrics(
            latestPrice,
            priceHistory,
            priceTablePreviousClose,
        )

        if (priceHistory.length >= MIN_BARS_FOR_METRICS) {
            await this.persistStockMetrics(enrichedStock.id, performance)
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
