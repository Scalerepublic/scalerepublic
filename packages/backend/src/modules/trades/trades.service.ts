import { and, eq, sql } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import type { DbOrTx } from '../../db/index.ts';
import { trade } from '../../db/schema/trade/trade.ts';

export type TradeRecord = typeof trade.$inferSelect;

export type Holding = {
    stockId: string;
    quantity: number;
    avgCost: number;
};

export class TradesService {
    constructor(private readonly ctx: AppVars) {}

    async getHoldingsByPortfolioId(portfolioId: string): Promise<Holding[]> {
        const rows = await this.ctx.db
            .select({
                stockId: trade.stockId,
                quantity: sql<number>`
                    sum(case when ${trade.tradeType} = 'BUY' then ${trade.quantity} else -${trade.quantity} end)
                `.as('quantity'),
                avgCost: sql<number>`
                    sum(case when ${trade.tradeType} = 'BUY' then ${trade.quantity} * ${trade.executedPrice}::numeric else 0 end)
                    / nullif(sum(case when ${trade.tradeType} = 'BUY' then ${trade.quantity} else 0 end), 0)
                `.as('avg_cost'),
            })
            .from(trade)
            .where(and(eq(trade.portfolioId, portfolioId), eq(trade.status, 'EXECUTED')))
            .groupBy(trade.stockId);

        return rows.filter((r) => r.quantity > 0);
    }

    async executeBuy(
        portfolioId: string,
        stockId: string,
        quantity: number,
        price: number,
        db: DbOrTx = this.ctx.db,
    ): Promise<TradeRecord> {
        const rows = await db
            .insert(trade)
            .values({
                id: crypto.randomUUID(),
                portfolioId,
                stockId,
                tradeType: 'BUY',
                quantity,
                executedPrice: price.toFixed(4),
                status: 'EXECUTED',
                executedAt: new Date(),
            })
            .returning();

        return rows[0]!;
    }

    async executeSell(
        portfolioId: string,
        stockId: string,
        quantity: number,
        price: number,
        db: DbOrTx = this.ctx.db,
    ): Promise<TradeRecord> {
        const rows = await db
            .insert(trade)
            .values({
                id: crypto.randomUUID(),
                portfolioId,
                stockId,
                tradeType: 'SELL',
                quantity,
                executedPrice: price.toFixed(4),
                status: 'EXECUTED',
                executedAt: new Date(),
            })
            .returning();

        return rows[0]!;
    }
}
