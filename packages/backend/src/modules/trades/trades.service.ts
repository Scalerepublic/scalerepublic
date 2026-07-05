import { and, eq, inArray, sql } from 'drizzle-orm';

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

    async listHeldStockIds(): Promise<string[]> {
        const rows = await this.ctx.db
            .select({
                stockId: trade.stockId,
                quantity: sql<number>`
                    sum(case when ${trade.tradeType} = 'BUY' then ${trade.quantity} else -${trade.quantity} end)
                `.as('quantity'),
            })
            .from(trade)
            .where(eq(trade.status, 'EXECUTED'))
            .groupBy(trade.stockId);

        return rows.filter((row) => row.quantity > 0).map((row) => row.stockId);
    }

    async getHoldingsByPortfolioIds(portfolioIds: string[]): Promise<Map<string, Holding[]>> {
        if (portfolioIds.length === 0) {
            return new Map();
        }

        const rows = await this.ctx.db
            .select({
                portfolioId: trade.portfolioId,
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
            .where(and(inArray(trade.portfolioId, portfolioIds), eq(trade.status, 'EXECUTED')))
            .groupBy(trade.portfolioId, trade.stockId);

        const holdingsByPortfolio = new Map<string, Holding[]>();
        for (const row of rows) {
            if (row.quantity <= 0) continue;
            const holdings = holdingsByPortfolio.get(row.portfolioId) ?? [];
            holdings.push({
                stockId: row.stockId,
                quantity: row.quantity,
                avgCost: row.avgCost,
            });
            holdingsByPortfolio.set(row.portfolioId, holdings);
        }

        return holdingsByPortfolio;
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
