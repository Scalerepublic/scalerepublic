import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { portfolio } from '../../db/schema/portfolio/portfolio.ts';
import { holding } from '../../db/schema/portfolio/holding.ts';
import { trade } from '../../db/schema/trade/trade.ts';
import { createAlphaVantageClient } from '../stockapi/stockapi.client.ts';

const mockStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 210 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 330 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420 },
]

export class StockService {
    getAll() {
        return mockStocks
    }

    calculateTotal(symbol: string, quantity: number, price: number) {
        return {
            symbol,
            quantity,
            price,
            total: quantity * price,
        }
    }

    private async fetchPrice(stockId: string): Promise<number | null> {
        try {
            const client = createAlphaVantageClient()
            const quote = await Promise.race([
                client.getGlobalQuote(stockId),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                ),
            ])
            const price = parseFloat(quote['Global Quote']['05. price'])
            return isNaN(price) ? null : price
        } catch {
            return null
        }
    }

    async buy(stockId: string, menge: number, userId: string): Promise<boolean> {
        const price = await this.fetchPrice(stockId)
        if (!price) return false

        const totalCost = price * menge

        try {
            await db.transaction(async (tx) => {
                const [userPortfolio] = await tx
                    .select()
                    .from(portfolio)
                    .where(eq(portfolio.userId, userId))
                    .limit(1)

                if (!userPortfolio || userPortfolio.status !== 'ACTIVE') {
                    throw new Error('portfolio_not_found')
                }

                const cashBalance = parseFloat(userPortfolio.cashBalance)
                if (cashBalance < totalCost) {
                    throw new Error('insufficient_funds')
                }

                await tx
                    .update(portfolio)
                    .set({ cashBalance: String(cashBalance - totalCost) })
                    .where(eq(portfolio.id, userPortfolio.id))

                await tx.insert(trade).values({
                    id: crypto.randomUUID(),
                    portfolioId: userPortfolio.id,
                    stockId,
                    tradeType: 'BUY',
                    quantity: menge,
                    executedPrice: String(price),
                    status: 'EXECUTED',
                    executedAt: new Date(),
                })

                const [existingHolding] = await tx
                    .select()
                    .from(holding)
                    .where(and(
                        eq(holding.portfolioId, userPortfolio.id),
                        eq(holding.stockId, stockId)
                    ))
                    .limit(1)

                if (existingHolding) {
                    const oldQty = existingHolding.quantity
                    const oldAvg = parseFloat(existingHolding.avgCost ?? '0')
                    const newQty = oldQty + menge
                    const newAvg = (oldQty * oldAvg + menge * price) / newQty

                    await tx
                        .update(holding)
                        .set({ quantity: newQty, avgCost: String(newAvg) })
                        .where(eq(holding.id, existingHolding.id))
                } else {
                    await tx.insert(holding).values({
                        id: crypto.randomUUID(),
                        portfolioId: userPortfolio.id,
                        stockId,
                        quantity: menge,
                        avgCost: String(price),
                    })
                }
            })

            return true
        } catch {
            return false
        }
    }

    async sell(stockId: string, menge: number, userId: string): Promise<boolean> {
        const price = await this.fetchPrice(stockId)
        if (!price) return false

        const totalRevenue = price * menge

        try {
            await db.transaction(async (tx) => {
                const [userPortfolio] = await tx
                    .select()
                    .from(portfolio)
                    .where(eq(portfolio.userId, userId))
                    .limit(1)

                if (!userPortfolio || userPortfolio.status !== 'ACTIVE') {
                    throw new Error('portfolio_not_found')
                }

                const [existingHolding] = await tx
                    .select()
                    .from(holding)
                    .where(and(
                        eq(holding.portfolioId, userPortfolio.id),
                        eq(holding.stockId, stockId)
                    ))
                    .limit(1)

                if (!existingHolding || existingHolding.quantity < menge) {
                    throw new Error('insufficient_holdings')
                }

                await tx
                    .update(holding)
                    .set({ quantity: existingHolding.quantity - menge })
                    .where(eq(holding.id, existingHolding.id))

                await tx.insert(trade).values({
                    id: crypto.randomUUID(),
                    portfolioId: userPortfolio.id,
                    stockId,
                    tradeType: 'SELL',
                    quantity: menge,
                    executedPrice: String(price),
                    status: 'EXECUTED',
                    executedAt: new Date(),
                })

                const cashBalance = parseFloat(userPortfolio.cashBalance)
                await tx
                    .update(portfolio)
                    .set({ cashBalance: String(cashBalance + totalRevenue) })
                    .where(eq(portfolio.id, userPortfolio.id))
            })

            return true
        } catch {
            return false
        }
    }
}