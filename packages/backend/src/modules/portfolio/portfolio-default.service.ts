import { and, eq } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { portfolio } from '../../db/schema/portfolio/portfolio.ts';
import { autoTradeRule } from '../../db/schema/trade/autoTrade.ts';

import { MAX_DEFAULT_STRIKES } from './portfolio.services.ts';

const DEFAULT_MIN_NET_WORTH_THRESHOLD = 1.0;

export class PortfolioDefaultService {
    constructor(private readonly ctx: AppVars) {}

    private get minNetWorthThreshold(): number {
        const raw = process.env['MIN_NET_WORTH_THRESHOLD'];
        if (raw === undefined || raw.trim() === '') return DEFAULT_MIN_NET_WORTH_THRESHOLD;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_NET_WORTH_THRESHOLD;
    }

    async checkPortfolio(portfolioId: string): Promise<void> {
        const p = await this.ctx.portfolioService.getById(portfolioId);
        if (p.status !== 'ACTIVE') return;

        const netWorth = await this.ctx.portfolioService.getNetWorth(portfolioId);
        if (netWorth < this.minNetWorthThreshold) {
            await this.defaultPortfolio(portfolioId);
        }
    }

    async checkAllActivePortfolios(): Promise<void> {
        const activePortfolios = await this.ctx.db
            .select({ id: portfolio.id })
            .from(portfolio)
            .where(eq(portfolio.status, 'ACTIVE'));

        for (const row of activePortfolios) {
            await this.checkPortfolio(row.id);
        }
    }

    async defaultPortfolio(portfolioId: string): Promise<void> {
        const p = await this.ctx.portfolioService.getById(portfolioId);
        if (p.status !== 'ACTIVE') return;

        const userId = p.userId;
        const now = new Date();

        await this.ctx.db.transaction(async (tx) => {
            await tx
                .update(portfolio)
                .set({ status: 'DEFAULTED', defaultedAt: now })
                .where(eq(portfolio.id, portfolioId));

            await tx
                .update(autoTradeRule)
                .set({ status: 'CANCELLED' })
                .where(
                    and(
                        eq(autoTradeRule.portfolioId, portfolioId),
                        eq(autoTradeRule.status, 'ACTIVE'),
                    ),
                );
        });

        const defaultCount = await this.ctx.portfolioService.getDefaultCount(userId);
        if (defaultCount < MAX_DEFAULT_STRIKES) {
            await this.ctx.portfolioService.createForUser(userId);
        }
    }
}
