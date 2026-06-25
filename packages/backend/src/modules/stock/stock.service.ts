import { and, asc, desc, eq, gte, lte, ne, type SQL } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockDailyBar, stockPrice } from '../../db/schema/stock/index.ts'
import { DEBUG_MARKET_PRICE_SOURCE, isMarketDebugEnabled } from '../../lib/market-debug.ts'

const HISTORY_DAYS = 30
const MAX_DAILY_BAR_FETCHES = 10

export type StockSummary = {
    id: string
    ticker: string
    companyName: string
    exchange: string
    currency: string
    latestPrice: number | null
    previousClose: number | null
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
            return eq(stockPrice.source, DEBUG_MARKET_PRICE_SOURCE)
        }
        return ne(stockPrice.source, DEBUG_MARKET_PRICE_SOURCE)
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
            })
            .from(stock)
            .leftJoin(latestPricePerStock, eq(stock.id, latestPricePerStock.stockId))
            .where(eq(stock.isActive, true))

        const previousDayEnd = this.previousDayEnd()

        return Promise.all(
            rows.map(async (r) => {
                const latestPrice = r.latestPrice !== null ? parseFloat(r.latestPrice) : null
                const previousClose = await this.getLatestPriceByStockId(r.id, previousDayEnd)
                return {
                    ...r,
                    latestPrice,
                    previousClose,
                }
            }),
        )
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
        const [row] = await this.ctx.db
            .select({ ticker: stock.ticker })
            .from(stock)
            .where(eq(stock.id, stockId))
            .limit(1)
        return row?.ticker ?? null
    }

    async createStock(ticker: string, companyName: string, exchange: string, currency: string): Promise<string> {
        const id = crypto.randomUUID()
        await this.ctx.db.insert(stock).values({ id, ticker, companyName, exchange, currency, isActive: true }).onConflictDoNothing()
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]!.id
    }

    async getLatestPriceByStockId(stockId: string, asOf?: Date): Promise<number | null> {
        const conditions = [eq(stockPrice.stockId, stockId), ...this.priceFilters(asOf)]

        const [row] = await this.ctx.db
            .select({ price: stockPrice.price })
            .from(stockPrice)
            .where(and(...conditions))
            .orderBy(desc(stockPrice.recordedAt))
            .limit(1)

        return row ? parseFloat(row.price) : null
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

    private async cacheMissingDailyBars(stockId: string, ticker: string, days: number): Promise<void> {
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        let attempts = 0
        for (let offset = 0; offset < days && attempts < MAX_DAILY_BAR_FETCHES; offset += 1) {
            const tradingDate = this.formatUtcDate(this.addUtcDays(today, -offset))

            const [existing] = await this.ctx.db
                .select({ id: stockDailyBar.id })
                .from(stockDailyBar)
                .where(and(
                    eq(stockDailyBar.stockId, stockId),
                    eq(stockDailyBar.tradingDate, tradingDate),
                ))
                .limit(1)

            if (existing) continue

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

    async getStockDetail(ticker: string, historyDays = HISTORY_DAYS): Promise<StockDetail | null> {
        const [stockRow] = await this.ctx.db
            .select()
            .from(stock)
            .where(eq(stock.ticker, ticker))
            .limit(1)

        if (!stockRow) return null

        const enrichedStock = await this.ensureStockMetadata(stockRow)

        let priceHistory = await this.getCachedDailyBarHistory(enrichedStock.id, historyDays)
        if (priceHistory.length < historyDays) {
            await this.cacheMissingDailyBars(enrichedStock.id, enrichedStock.ticker, historyDays)
            priceHistory = await this.getCachedDailyBarHistory(enrichedStock.id, historyDays)
        }

        const latestPrice = await this.getLatestPriceByStockId(enrichedStock.id)
        const previousClose = await this.getLatestPriceByStockId(enrichedStock.id, this.previousDayEnd())

        if (priceHistory.length === 0) {
            const from = this.addUtcDays(new Date(), -(historyDays - 1))
            const fallback = await this.getPriceHistory(ticker, from, new Date())
            priceHistory = (fallback ?? []).map((point) => ({
                date: this.formatUtcDate(point.recordedAt),
                close: point.price,
            }))
        }

        const dayChange =
            latestPrice !== null && previousClose !== null ? latestPrice - previousClose : null
        const dayChangePercent =
            dayChange !== null && previousClose !== null && previousClose > 0
                ? (dayChange / previousClose) * 100
                : null

        const firstClose = priceHistory[0]?.close ?? null
        const periodChangePercent =
            latestPrice !== null && firstClose !== null && firstClose > 0
                ? ((latestPrice - firstClose) / firstClose) * 100
                : null

        return {
            stock: {
                id: enrichedStock.id,
                ticker: enrichedStock.ticker,
                companyName: enrichedStock.companyName,
                exchange: enrichedStock.exchange,
                currency: enrichedStock.currency,
                description: this.buildPlaceholderDescription(enrichedStock.companyName), // TODO, GET REAL DESCRIPTION
                isAccumulating: enrichedStock.isAccumulating,
            },
            performance: {
                latestPrice,
                previousClose,
                dayChange,
                dayChangePercent,
                periodChangePercent,
            },
            priceHistory,
        }
    }
}
