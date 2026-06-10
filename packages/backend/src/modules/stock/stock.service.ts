import { and, asc, desc, eq, gte, lte, type SQL } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockPrice } from '../../db/schema/stock/index.ts'
import { isMarketDebugEnabled } from '../../lib/market-debug.ts'

export type StockSummary = {
    id: string
    ticker: string
    companyName: string
    exchange: string
    currency: string
    latestPrice: number | null
}

export class StockService {
    constructor(private readonly ctx: AppVars) {}

    private priceAsOfFilter(): SQL | undefined {
        if (!isMarketDebugEnabled()) return undefined;
        const asOf = this.ctx.marketDebugService.getAsOf();
        return lte(stockPrice.recordedAt, asOf);
    }

    async getAll(): Promise<StockSummary[]> {
        const asOfClause = this.priceAsOfFilter();
        const latestPricePerStock = this.ctx.db
            .selectDistinctOn([stockPrice.stockId], {
                stockId: stockPrice.stockId,
                price: stockPrice.price,
            })
            .from(stockPrice)
            .where(asOfClause)
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

        return rows.map((r) => ({
            ...r,
            latestPrice: r.latestPrice !== null ? parseFloat(r.latestPrice) : null,
        }))
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
        // Re-fetch to handle the case where a concurrent insert won the race
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]!.id
    }

    async getLatestPriceByStockId(stockId: string, asOf?: Date): Promise<number | null> {
        const effectiveAsOf =
            asOf ?? (isMarketDebugEnabled() ? this.ctx.marketDebugService.getAsOf() : undefined);
        const conditions = [eq(stockPrice.stockId, stockId)];
        if (effectiveAsOf) {
            conditions.push(lte(stockPrice.recordedAt, effectiveAsOf));
        }

        const [row] = await this.ctx.db
            .select({ price: stockPrice.price })
            .from(stockPrice)
            .where(and(...conditions))
            .orderBy(desc(stockPrice.recordedAt))
            .limit(1);

        return row ? parseFloat(row.price) : null;
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
}
