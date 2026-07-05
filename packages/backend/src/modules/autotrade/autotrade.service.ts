import { and, desc, eq, lt } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import type { DbOrTx } from '../../db/index.ts';
import { autoTradeRule } from '../../db/schema/trade/autoTrade.ts';
import { trade } from '../../db/schema/trade/trade.ts';
import {
    InsufficientFundsError,
    InsufficientHoldingsError,
    PortfolioDefaultedError,
    PriceMismatchError,
    StockPriceUnavailableError,
} from '../portfolio/errors.ts';
import type { TradeRecord } from '../trades/trades.service.ts';

import { AutoTradeNotFoundError, InvalidAutoTradeError } from './errors.ts';

export type AutoTradeRecord = typeof autoTradeRule.$inferSelect;
export type AutoTradeRuleType = AutoTradeRecord['ruleType'];
export type AutoTradeTriggerDirection = AutoTradeRecord['triggerDirection'];

export class AutoTradeService {
    constructor(private readonly ctx: AppVars) {}

    async createAutoTrade(params: {
        portfolioId: string;
        stockId: string;
        ruleType: AutoTradeRuleType;
        triggerDirection: AutoTradeTriggerDirection;
        priceThreshold: number;
        quantity: number;
        expiresAt?: Date | null;
    }): Promise<AutoTradeRecord> {
        const { portfolioId, stockId, ruleType, triggerDirection, priceThreshold, quantity, expiresAt } = params;

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new InvalidAutoTradeError('quantity must be a positive integer');
        }
        if (!(priceThreshold > 0)) {
            throw new InvalidAutoTradeError('priceThreshold must be greater than 0');
        }
        if (expiresAt !== null && expiresAt !== undefined && expiresAt.getTime() <= Date.now()) {
            throw new InvalidAutoTradeError('expiresAt must be in the future');
        }

        const p = await this.ctx.portfolioService.getById(portfolioId);
        if (p.status !== 'ACTIVE') throw new PortfolioDefaultedError(portfolioId);

        const rows = await this.ctx.db
            .insert(autoTradeRule)
            .values({
                id: crypto.randomUUID(),
                portfolioId,
                stockId,
                ruleType,
                triggerDirection,
                priceThreshold: priceThreshold.toFixed(4),
                quantity,
                status: 'ACTIVE',
                expiresAt: expiresAt ?? null,
            })
            .returning();

        return rows[0]!;
    }

    async cancelAutoTrade(ruleId: string): Promise<AutoTradeRecord> {
        const rows = await this.ctx.db
            .update(autoTradeRule)
            .set({ status: 'CANCELLED' })
            .where(and(eq(autoTradeRule.id, ruleId), eq(autoTradeRule.status, 'ACTIVE')))
            .returning();

        const row = rows[0];
        if (!row) throw new AutoTradeNotFoundError(ruleId);
        return row;
    }

    async getActiveAutoTrades(db: DbOrTx = this.ctx.db): Promise<AutoTradeRecord[]> {
        return db.select().from(autoTradeRule).where(eq(autoTradeRule.status, 'ACTIVE'));
    }

    async getByPortfolioId(portfolioId: string): Promise<AutoTradeRecord[]> {
        return this.ctx.db
            .select()
            .from(autoTradeRule)
            .where(eq(autoTradeRule.portfolioId, portfolioId))
            .orderBy(desc(autoTradeRule.createdAt));
    }

    shouldTrigger(triggerDirection: AutoTradeTriggerDirection, priceThreshold: number, price: number): boolean {
        return triggerDirection === 'AT_OR_ABOVE' ? price >= priceThreshold : price <= priceThreshold;
    }

    async expireAutoTrades(now: Date = new Date()): Promise<number> {
        const rows = await this.ctx.db
            .update(autoTradeRule)
            .set({ status: 'EXPIRED' })
            .where(and(eq(autoTradeRule.status, 'ACTIVE'), lt(autoTradeRule.expiresAt, now)))
            .returning({ id: autoTradeRule.id });

        return rows.length;
    }

    async executeAutoTrade(rule: AutoTradeRecord): Promise<TradeRecord | null> {
        if (rule.status !== 'ACTIVE') return null;

        const price = await this.ctx.stockService.getLatestPriceByStockId(rule.stockId);
        if (price === null) return null;

        const threshold = parseFloat(rule.priceThreshold);
        if (!this.shouldTrigger(rule.triggerDirection, threshold, price)) return null;

        try {
            // Trade and rule update in one transaction
            return await this.ctx.db.transaction(async (tx) => {
                const tradeRow =
                    rule.ruleType === 'BUY'
                        ? await this.ctx.portfolioService.buy(rule.portfolioId, rule.stockId, rule.quantity, price, tx)
                        : await this.ctx.portfolioService.sell(rule.portfolioId, rule.stockId, rule.quantity, price, tx);

                await tx
                    .update(autoTradeRule)
                    .set({ status: 'TRIGGERED', triggeredTradeId: tradeRow.id })
                    .where(and(eq(autoTradeRule.id, rule.id), eq(autoTradeRule.status, 'ACTIVE')));

                const linked = await tx
                    .update(trade)
                    .set({ autoTradeRuleId: rule.id })
                    .where(eq(trade.id, tradeRow.id))
                    .returning();

                return linked[0]!;
            });
        } catch (err) {
            if (
                err instanceof InsufficientFundsError ||
                err instanceof InsufficientHoldingsError ||
                err instanceof PortfolioDefaultedError ||
                err instanceof PriceMismatchError ||
                err instanceof StockPriceUnavailableError
            ) {
                // Stay ACTIVE to retry on a later tick.
                console.warn(`[autotrade] Rule ${rule.id} could not execute: ${err.message}`);
                return null;
            }
            throw err;
        }
    }
}
