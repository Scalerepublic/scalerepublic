import { desc, eq, and } from 'drizzle-orm'

import { db } from '../../db/index.ts'
import { portfolio } from '../../db/schema/portfolio/portfolio.ts'
import { holding } from '../../db/schema/portfolio/holding.ts'
import { stockPrice } from '../../db/schema/stock/market.ts'
import { trade } from '../../db/schema/trade/trade.ts'

export class StockService {
    async getLatestPrice(stockId: string) {
        const rows = await db
            .select()
            .from(stockPrice)
            .where(eq(stockPrice.stockId, stockId))
            .orderBy(desc(stockPrice.recordedAt))
            .limit(1)

        return rows[0] ?? null
    }

    async buy(stockId: string, quantity: number, userId: string) {
        const latestPrice = await this.getLatestPrice(stockId)

        if (!latestPrice) {
            return { success: false, reason: 'NO_PRICE_FOUND' }
        }

        const price = Number(latestPrice.price)
        const total = price * quantity

        const portfolioRows = await db
            .select()
            .from(portfolio)
            .where(eq(portfolio.userId, userId))
            .limit(1)

        const userPortfolio = portfolioRows[0]

        if (!userPortfolio) {
            return { success: false, reason: 'NO_PORTFOLIO_FOUND' }
        }

        const cashBalance = Number(userPortfolio.cashBalance)

        if (cashBalance < total) {
            return {
                success: false,
                reason: 'INSUFFICIENT_BALANCE',
                price,
                quantity,
                total,
                cashBalance,
            }
        }

        await db.insert(trade).values({
            id: crypto.randomUUID(),
            portfolioId: userPortfolio.id,
            stockId,
            tradeType: 'BUY',
            quantity,
            executedPrice: price.toString(),
            status: 'EXECUTED',
            executedAt: new Date(),
        })

        return {
            success: true,
            tradeType: 'BUY',
            stockId,
            quantity,
            price,
            total,
        }
    }

    async sell(stockId: string, quantity: number, userId: string) {
        const latestPrice = await this.getLatestPrice(stockId)

        if (!latestPrice) {
            return { success: false, reason: 'NO_PRICE_FOUND' }
        }

        const price = Number(latestPrice.price)
        const total = price * quantity

        const portfolioRows = await db
            .select()
            .from(portfolio)
            .where(eq(portfolio.userId, userId))
            .limit(1)

        const userPortfolio = portfolioRows[0]

        if (!userPortfolio) {
            return { success: false, reason: 'NO_PORTFOLIO_FOUND' }
        }

        const holdingRows = await db
            .select()
            .from(holding)
            .where(and(eq(holding.portfolioId, userPortfolio.id), eq(holding.stockId, stockId)))
            .limit(1)

        const userHolding = holdingRows[0]

        if (!userHolding || userHolding.quantity < quantity) {
            return {
                success: false,
                reason: 'INSUFFICIENT_STOCK_QUANTITY',
                availableQuantity: userHolding?.quantity ?? 0,
                requestedQuantity: quantity,
            }
        }

        await db.insert(trade).values({
            id: crypto.randomUUID(),
            portfolioId: userPortfolio.id,
            stockId,
            tradeType: 'SELL',
            quantity,
            executedPrice: price.toString(),
            status: 'EXECUTED',
            executedAt: new Date(),
        })

        return {
            success: true,
            tradeType: 'SELL',
            stockId,
            quantity,
            price,
            total,
        }
    }
}