import { sql } from 'drizzle-orm'

import { db } from '../../src/db/index.ts'
import { user } from '../../src/db/schema/auth-schema.ts'
import { portfolio } from '../../src/db/schema/portfolio/portfolio.ts'
import { stockPrice } from '../../src/db/schema/stock/market.ts'
import { stock } from '../../src/db/schema/stock/stock.ts'

export const resetDb = async (): Promise<void> => {
    // CASCADE handles all FK-dependent tables (portfolio, trade, stock_price, etc.)
    await db.execute(sql`TRUNCATE TABLE "user", stock CASCADE`)
}

export const seedPortfolio = async (opts?: {
    cashBalance?: string
    name?: string
    email?: string
}): Promise<{ userId: string; portfolioId: string }> => {
    const userId = crypto.randomUUID()
    const portfolioId = crypto.randomUUID()
    const balance = opts?.cashBalance ?? '1000.00'

    await db.insert(user).values({
        id: userId,
        name: opts?.name ?? 'Test User',
        email: opts?.email ?? `${userId}@test.com`,
    })

    await db.insert(portfolio).values({
        id: portfolioId,
        userId,
        cashBalance: balance,
        startingCapital: balance,
        status: 'ACTIVE',
    })

    return { userId, portfolioId }
}

export const seedStock = async (opts?: { ticker?: string }): Promise<{ stockId: string }> => {
    const stockId = crypto.randomUUID()
    const ticker = opts?.ticker ?? `T${crypto.randomUUID().slice(0, 4).toUpperCase()}`

    await db.insert(stock).values({
        id: stockId,
        ticker,
        companyName: `${ticker} Corp`,
        exchange: 'NASDAQ',
        currency: 'USD',
        isActive: true,
    })

    return { stockId }
}

export const seedPrice = async (stockId: string, price: number): Promise<void> => {
    await db.insert(stockPrice).values({
        id: crypto.randomUUID(),
        stockId,
        price: price.toFixed(4),
        source: 'test',
        recordedAt: new Date(),
    })
}
