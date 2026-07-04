import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockDailyBar, stockPrice } from '../../db/schema/stock/index.ts'
import {
    DEBUG_MARKET_CRASH_SOURCE,
    DEBUG_MARKET_PRICE_SOURCE,
    isMarketDebugEnabled,
} from '../../lib/market-debug.ts'

import { getSectorTickers, MARKET_SECTORS, type MarketSectorId } from './market-sectors.ts'

const HISTORY_DAYS = 30
const MAX_DAILY_BAR_FETCHES = 10
const ON_DEMAND_DETAIL_BAR_FETCHES = HISTORY_DAYS
const MIN_BARS_FOR_METRICS = 2

export { HISTORY_DAYS, MAX_DAILY_BAR_FETCHES }

export type StockListResult = {
    items: StockSummary[]
    total: number
    page: number
    limit: number
}

export type MarketSectorSummary = {
    id: MarketSectorId
    label: string
    description: string
    count: number
}

export type MarketSectorCatalog = {
    sectors: MarketSectorSummary[]
    totalListings: number
}

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

        try {
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
        } catch {
            return new Map()
        }
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

    private buildLatestPriceSubquery() {
        const filters = this.priceFilters()
        return this.ctx.db
            .selectDistinctOn([stockPrice.stockId], {
                stockId: stockPrice.stockId,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(and(...filters))
            .orderBy(stockPrice.stockId, desc(stockPrice.recordedAt))
            .as('latest_price')
    }

    private mapListRowToSummary(row: {
        id: string
        ticker: string
        companyName: string
        exchange: string
        currency: string
        latestPrice: string | null
        periodChangePercent: string | null
        dayChangePercent: string | null
    }): StockSummary {
        const latestPrice = row.latestPrice !== null ? parseFloat(row.latestPrice) : null
        const persistedPeriod = this.parsePersistedMetric(row.periodChangePercent)
        const persistedDay = this.parsePersistedMetric(row.dayChangePercent)
        let dayChange: number | null = null

        if (persistedDay !== null && latestPrice !== null) {
            dayChange = latestPrice - latestPrice / (1 + persistedDay / 100)
        }

        return {
            id: row.id,
            ticker: row.ticker,
            companyName: row.companyName,
            exchange: row.exchange,
            currency: row.currency,
            latestPrice,
            previousClose: null,
            dayChange,
            dayChangePercent: persistedDay,
            periodChangePercent: persistedPeriod,
        }
    }

    private buildListWhereClause(options: {
        q?: string
        sector?: string
    }): SQL | undefined {
        const clauses: SQL[] = [eq(stock.isActive, true)]

        const query = options.q?.trim()
        if (query !== undefined && query.length > 0) {
            const pattern = `%${query}%`
            clauses.push(or(
                ilike(stock.ticker, pattern),
                ilike(stock.companyName, pattern),
            )!)
        }

        const sector = options.sector?.trim()
        if (sector !== undefined && sector.length > 0 && sector !== 'all') {
            const tickers = getSectorTickers(sector)
            if (tickers.length === 0) {
                return sql`false`
            }
            clauses.push(inArray(stock.ticker, tickers))
        }

        return and(...clauses)
    }

    async listStocks(options: {
        q?: string
        sector?: string
        page: number
        limit: number
    }): Promise<StockListResult> {
        const page = Math.max(1, options.page)
        const limit = Math.min(48, Math.max(1, options.limit))
        const where = this.buildListWhereClause(options)

        const [countRow] = await this.ctx.db
            .select({ total: count() })
            .from(stock)
            .where(where)

        const totalCount = Number(countRow?.total ?? 0)
        if (totalCount === 0) {
            return { items: [], total: 0, page, limit }
        }

        const latestPricePerStock = this.buildLatestPriceSubquery()
        const offset = (page - 1) * limit

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
            .where(where)
            .orderBy(asc(stock.ticker))
            .limit(limit)
            .offset(offset)

        return {
            items: rows.map((row) => this.mapListRowToSummary(row)),
            total: totalCount,
            page,
            limit,
        }
    }

    async getTrending(limit = 6): Promise<StockSummary[]> {
        const latestPricePerStock = this.buildLatestPriceSubquery()

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
            .innerJoin(latestPricePerStock, eq(stock.id, latestPricePerStock.stockId))
            .where(eq(stock.isActive, true))
            .limit(Math.max(limit, 1) * 8)

        return rows
            .map((row) => this.mapListRowToSummary(row))
            .sort((left, right) => {
                const leftMove = Math.abs(left.dayChangePercent ?? left.periodChangePercent ?? 0)
                const rightMove = Math.abs(right.dayChangePercent ?? right.periodChangePercent ?? 0)
                return rightMove - leftMove
            })
            .slice(0, limit)
    }

    async getSectorCatalog(): Promise<MarketSectorCatalog> {
        const summaries: MarketSectorSummary[] = []

        for (const sector of MARKET_SECTORS) {
            const [countRow] = await this.ctx.db
                .select({ total: count() })
                .from(stock)
                .where(and(
                    eq(stock.isActive, true),
                    inArray(stock.ticker, [...sector.tickers]),
                ))

            summaries.push({
                id: sector.id,
                label: sector.label,
                description: sector.description,
                count: Number(countRow?.total ?? 0),
            })
        }

        const [listingsRow] = await this.ctx.db
            .select({ totalListings: count() })
            .from(stock)
            .where(eq(stock.isActive, true))

        return {
            sectors: summaries,
            totalListings: Number(listingsRow?.totalListings ?? 0),
        }
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
            if (row.latestPrice === null) {
                return false
            }
            const persistedPeriod = this.parsePersistedMetric(row.periodChangePercent)
            const persistedDay = this.parsePersistedMetric(row.dayChangePercent)
            return persistedPeriod === null && persistedDay === null
        })

        const fallbackIds = rowsNeedingFallback
            .slice(0, MAX_DAILY_BAR_FETCHES)
            .map((row) => row.id)
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

    async listStocksNeedingNames(limit: number): Promise<Array<{ id: string; ticker: string }>> {
        return this.ctx.db
            .select({ id: stock.id, ticker: stock.ticker })
            .from(stock)
            .where(and(
                eq(stock.isActive, true),
                sql`${stock.companyName} = ${stock.ticker}`,
            ))
            .orderBy(desc(stock.backfillRequestedAt), asc(stock.ticker))
            .limit(limit)
    }

    async listStocksNeedingHistory(
        limit: number,
        days = HISTORY_DAYS,
    ): Promise<Array<{ id: string; ticker: string }>> {
        const fromDate = this.formatUtcDate(this.addUtcDays(new Date(), -(days - 1)))

        const rows = await this.ctx.db
            .select({
                id: stock.id,
                ticker: stock.ticker,
                barCount: count(stockDailyBar.id),
            })
            .from(stock)
            .leftJoin(stockDailyBar, and(
                eq(stockDailyBar.stockId, stock.id),
                gte(stockDailyBar.tradingDate, fromDate),
            ))
            .where(eq(stock.isActive, true))
            .groupBy(stock.id, stock.ticker, stock.backfillRequestedAt)
            .having(sql`count(${stockDailyBar.id}) < ${days}`)
            .orderBy(desc(stock.backfillRequestedAt), sql`count(${stockDailyBar.id}) asc`, asc(stock.ticker))
            .limit(limit)

        return rows.map(({ id, ticker }) => ({ id, ticker }))
    }

    async requestBackfillPriority(stockId: string): Promise<void> {
        await this.ctx.db
            .update(stock)
            .set({ backfillRequestedAt: new Date() })
            .where(eq(stock.id, stockId))
    }

    async backfillTickerFully(ticker: string): Promise<void> {
        const stockId = await this.getStockId(ticker)
        if (stockId === null) {
            throw new Error(`Unknown ticker: ${ticker}`)
        }

        await this.applyStockNameFromApi(stockId, ticker)
        await this.backfillStockHistory(stockId, ticker, {
            days: HISTORY_DAYS,
            maxFetches: HISTORY_DAYS,
        })
    }

    async applyStockNameFromApi(stockId: string, ticker: string): Promise<boolean> {
        const bar = await this.ctx.stockDataClient.getDailyBar(ticker)
        if (bar === null || bar.name === '' || bar.name === ticker) {
            return false
        }
        await this.applyResolvedName(stockId, ticker, bar.name)
        return true
    }

    async backfillStockHistory(
        stockId: string,
        ticker: string,
        options?: { days?: number; maxFetches?: number },
    ): Promise<{ fetchesUsed: number }> {
        const days = options?.days ?? HISTORY_DAYS
        const maxFetches = options?.maxFetches ?? MAX_DAILY_BAR_FETCHES
        const beforeCount = (await this.getCachedDailyBarHistory(stockId, days)).length
        const { resolvedName, fetchesUsed } = await this.cacheMissingDailyBars(stockId, ticker, days, maxFetches)

        if (resolvedName !== null && resolvedName !== '') {
            await this.applyResolvedName(stockId, ticker, resolvedName)
        }

        const history = await this.getCachedDailyBarHistory(stockId, days)
        if (history.length <= beforeCount) {
            return { fetchesUsed }
        }

        const todayStr = this.formatUtcDate(new Date())
        const todayBar = history.find((bar) => bar.date === todayStr)
        if (todayBar) {
            const latestPrice = await this.getLatestPriceByStockId(stockId)
            if (latestPrice === null) {
                await this.insertPrice(
                    stockId,
                    todayBar.close,
                    this.ctx.stockDataClient.source,
                    new Date(),
                )
            }
        }

        if (history.length >= MIN_BARS_FOR_METRICS) {
            await this.refreshStockMetrics(stockId)
        }

        return { fetchesUsed }
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

    private normalizeTradingDate(value: string | Date): string {
        if (value instanceof Date) {
            return this.formatUtcDate(value)
        }
        return value.slice(0, 10)
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
        const description = this.buildPlaceholderDescription(companyName)

        if (stockRow.companyName !== stockRow.ticker) {
            await this.ctx.db
                .update(stock)
                .set({ description })
                .where(eq(stock.id, stockRow.id))
            return { ...stockRow, description }
        }

        const meta = await this.ctx.stockDataClient.getStockMeta(stockRow.ticker)
        const resolvedName = meta?.name ?? companyName
        const resolvedDescription = this.buildPlaceholderDescription(resolvedName)
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

    private async applyResolvedName(stockId: string, ticker: string, name: string): Promise<void> {
        const trimmedName = name.trim()
        if (!trimmedName || trimmedName === ticker) {
            return
        }

        const [row] = await this.ctx.db
            .select({ companyName: stock.companyName })
            .from(stock)
            .where(eq(stock.id, stockId))
            .limit(1)

        if (!row || row.companyName !== ticker) {
            return
        }

        await this.ctx.db
            .update(stock)
            .set({
                companyName: trimmedName,
                description: this.buildPlaceholderDescription(trimmedName),
            })
            .where(eq(stock.id, stockId))
    }

    private async cacheMissingDailyBars(
        stockId: string,
        ticker: string,
        days: number,
        maxFetches = MAX_DAILY_BAR_FETCHES,
    ): Promise<{ resolvedName: string | null; fetchesUsed: number }> {
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

        const existingDates = new Set(
            existingRows.map((row) => this.normalizeTradingDate(row.tradingDate)),
        )
        let resolvedName: string | null = null

        let attempts = 0
        for (let offset = 0; offset < days && attempts < maxFetches; offset += 1) {
            const tradingDate = this.formatUtcDate(this.addUtcDays(today, -offset))

            if (existingDates.has(tradingDate)) continue

            attempts += 1
            const bar = await this.ctx.stockDataClient.getDailyBar(ticker, this.addUtcDays(today, -offset))
            if (bar === null) continue

            const barDate = tradingDate

            if (
                resolvedName === null
                && bar.name !== ''
                && bar.name !== ticker
            ) {
                resolvedName = bar.name
            }

            await this.ctx.db.insert(stockDailyBar).values({
                id: crypto.randomUUID(),
                stockId,
                tradingDate: barDate,
                open: bar.open.toString(),
                high: bar.high.toString(),
                low: bar.low.toString(),
                close: bar.close.toString(),
                source: this.ctx.stockDataClient.source,
            }).onConflictDoNothing()
            existingDates.add(barDate)
        }

        return { resolvedName, fetchesUsed: attempts }
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
            date: this.normalizeTradingDate(row.tradingDate),
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

    private async seedLatestPriceFromHistory(
        stockId: string,
        priceHistory: Array<{ date: string; close: number }>,
    ): Promise<number | null> {
        const existing = await this.getLatestPriceByStockId(stockId)
        if (existing !== null) {
            return existing
        }

        const lastClose = priceHistory.at(-1)?.close ?? null
        if (lastClose === null) {
            return null
        }

        await this.insertPrice(
            stockId,
            lastClose,
            this.ctx.stockDataClient.source,
            new Date(),
        )
        return lastClose
    }

    private async prefetchDetailHistoryReturningName(
        stockId: string,
        ticker: string,
        days: number,
    ): Promise<string | null> {
        const first = await this.cacheMissingDailyBars(
            stockId,
            ticker,
            days,
            ON_DEMAND_DETAIL_BAR_FETCHES,
        )
        let resolvedName = first.resolvedName

        const history = await this.getCachedDailyBarHistory(stockId, days)
        if (history.length >= Math.min(days, MIN_BARS_FOR_METRICS)) {
            return resolvedName
        }

        const second = await this.cacheMissingDailyBars(
            stockId,
            ticker,
            days,
            ON_DEMAND_DETAIL_BAR_FETCHES,
        )
        if (second.resolvedName !== null) {
            resolvedName = second.resolvedName
        }
        return resolvedName
    }

    private async detailCacheIsWarm(
        stockId: string,
        days: number,
    ): Promise<{ warm: boolean; history: Array<{ date: string; close: number }> }> {
        const history = await this.getCachedDailyBarHistory(stockId, days)
        return {
            warm: history.length >= Math.min(days, MIN_BARS_FOR_METRICS),
            history,
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

        const cache = await this.detailCacheIsWarm(stockRow.id, historyDays)
        if (!cache.warm) {
            await this.requestBackfillPriority(stockRow.id)
            const resolvedName = await this.prefetchDetailHistoryReturningName(
                stockRow.id,
                stockRow.ticker,
                historyDays,
            )
            if (resolvedName !== null && resolvedName !== '') {
                await this.applyResolvedName(stockRow.id, stockRow.ticker, resolvedName)
            }
        }

        const [reloadedStock] = await this.ctx.db
            .select()
            .from(stock)
            .where(eq(stock.id, stockRow.id))
            .limit(1)

        let enrichedStock = reloadedStock ?? stockRow
        if (
            enrichedStock.companyName === enrichedStock.ticker
            || enrichedStock.description === null
            || enrichedStock.description === ''
        ) {
            enrichedStock = await this.ensureStockMetadata(enrichedStock)
        }

        const priceHistory = await this.getChartPriceHistory(
            enrichedStock.id,
            enrichedStock.ticker,
            historyDays,
        )

        const latestPrice = await this.seedLatestPriceFromHistory(enrichedStock.id, priceHistory)
            ?? await this.getLatestPriceByStockId(enrichedStock.id)
        const priceTablePreviousClose = await this.getLatestPriceByStockId(
            enrichedStock.id,
            this.previousDayEnd(),
        )

        const metricsHistory = priceHistory.slice(-HISTORY_DAYS)
        const performance = this.computePerformanceMetrics(
            latestPrice,
            metricsHistory,
            priceTablePreviousClose,
        )

        if (metricsHistory.length >= MIN_BARS_FOR_METRICS) {
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
