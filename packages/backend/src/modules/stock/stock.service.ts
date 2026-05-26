import { eq } from 'drizzle-orm'

import type { AppVars } from '../../context.ts'
import { stock, stockPrice } from '../../db/schema/stock/index.ts'

export type StockSummary = { symbol: string; name: string; price: number }

const mockStocks: StockSummary[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 210 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 330 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420 },
]

export class StockService {
    constructor(private readonly ctx: AppVars) {}

    getAll() {
        return mockStocks
    }

    calculateTotal(symbol: string, quantity: number, price: number) {
        return { symbol, quantity, price, total: quantity * price }
    }

    async getStockId(ticker: string): Promise<string | null> {
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]?.id ?? null
    }

    async createStock(ticker: string, companyName: string, exchange: string, currency: string): Promise<string> {
        const id = crypto.randomUUID()
        await this.ctx.db.insert(stock).values({ id, ticker, companyName, exchange, currency, isActive: true }).onConflictDoNothing()
        // Re-fetch to handle the case where a concurrent insert won the race
        const row = await this.ctx.db.select({ id: stock.id }).from(stock).where(eq(stock.ticker, ticker)).limit(1)
        return row[0]!.id
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
