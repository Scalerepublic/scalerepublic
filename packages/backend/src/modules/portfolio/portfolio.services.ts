import { and, count, desc, eq, max } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { portfolio } from '../../db/schema/portfolio/portfolio.ts';
import type { Holding, TradeRecord } from '../trades/trades.service.ts';

import {
    InsufficientFundsError,
    InsufficientHoldingsError,
    PortfolioDefaultedError,
    PortfolioNotFoundError,
    PriceMismatchError,
    StockPriceUnavailableError,
    UserSuspendedError,
} from './errors.ts';

export type Portfolio = typeof portfolio.$inferSelect;

export const DEFAULT_STARTING_CAPITAL = '1000.00';
export const MAX_DEFAULT_STRIKES = 3;

export class PortfolioService {
    constructor(private readonly ctx: AppVars) {}

    async getById(portfolioId: string): Promise<Portfolio> {
        const [row] = await this.ctx.db
            .select()
            .from(portfolio)
            .where(eq(portfolio.id, portfolioId));

        if (!row) throw new PortfolioNotFoundError(portfolioId);
        return row;
    }

    async getByUserId(userId: string): Promise<Portfolio[]> {
        return this.ctx.db
            .select()
            .from(portfolio)
            .where(eq(portfolio.userId, userId))
            .orderBy(desc(portfolio.createdAt));
    }

    async getActiveForUser(userId: string): Promise<Portfolio | null> {
        const [row] = await this.ctx.db
            .select()
            .from(portfolio)
            .where(and(eq(portfolio.userId, userId), eq(portfolio.status, 'ACTIVE')))
            .orderBy(desc(portfolio.createdAt))
            .limit(1);

        return row ?? null;
    }

    async getDefaultCount(userId: string): Promise<number> {
        const [row] = await this.ctx.db
            .select({ value: count() })
            .from(portfolio)
            .where(and(eq(portfolio.userId, userId), eq(portfolio.status, 'DEFAULTED')));

        return row?.value ?? 0;
    }

    async getLastDefaultedAt(userId: string): Promise<Date | null> {
        const [row] = await this.ctx.db
            .select({ value: max(portfolio.defaultedAt) })
            .from(portfolio)
            .where(and(eq(portfolio.userId, userId), eq(portfolio.status, 'DEFAULTED')));

        return row?.value ?? null;
    }

    async createForUser(userId: string): Promise<Portfolio> {
        const id = crypto.randomUUID();
        await this.ctx.db.insert(portfolio).values({
            id,
            userId,
            cashBalance: DEFAULT_STARTING_CAPITAL,
            startingCapital: DEFAULT_STARTING_CAPITAL,
            status: 'ACTIVE',
        });

        return this.getById(id);
    }

    async ensureForUser(userId: string): Promise<Portfolio> {
        const active = await this.getActiveForUser(userId);
        if (active) return active;

        const defaultCount = await this.getDefaultCount(userId);
        if (defaultCount >= MAX_DEFAULT_STRIKES) {
            throw new UserSuspendedError(userId);
        }

        return this.createForUser(userId);
    }

    async getHoldings(portfolioId: string): Promise<Holding[]> {
        return this.ctx.tradesService.getHoldingsByPortfolioId(portfolioId);
    }

    async getPortfolioValue(portfolioId: string): Promise<number> {
        const holdings = await this.getHoldings(portfolioId);
        let total = 0;
        for (const h of holdings) {
            const price = await this.ctx.stockService.getLatestPriceByStockId(h.stockId);
            if (price !== null) total += h.quantity * price;
        }
        return total;
    }

    async getNetWorth(portfolioId: string): Promise<number> {
        const p = await this.getById(portfolioId);
        const portfolioValue = await this.getPortfolioValue(portfolioId);
        return parseFloat(p.cashBalance) + portfolioValue;
    }

    private async verifyExpectedPrice(stockId: string, expectedPrice: number): Promise<number> {
        const currentPrice = await this.ctx.stockService.getLatestPriceByStockId(stockId);
        if (currentPrice === null) throw new StockPriceUnavailableError(stockId);
        if (parseFloat(currentPrice.toFixed(2)) !== parseFloat(expectedPrice.toFixed(2))) {
            throw new PriceMismatchError(expectedPrice, currentPrice);
        }
        return currentPrice;
    }

    async buy(
        portfolioId: string,
        stockId: string,
        quantity: number,
        expectedPrice: number,
    ): Promise<TradeRecord> {
        const [p, price] = await Promise.all([
            this.getById(portfolioId),
            this.verifyExpectedPrice(stockId, expectedPrice),
        ]);

        if (p.status === 'DEFAULTED') throw new PortfolioDefaultedError(portfolioId);

        const cashBalance = parseFloat(p.cashBalance);
        const cost = quantity * price;

        if (cashBalance < cost) throw new InsufficientFundsError(cashBalance, cost);

        const tradeRow = await this.ctx.db.transaction(async (tx) => {
            const row = await this.ctx.tradesService.executeBuy(portfolioId, stockId, quantity, price, tx);

            await tx
                .update(portfolio)
                .set({ cashBalance: (cashBalance - cost).toFixed(2) })
                .where(eq(portfolio.id, portfolioId));

            return row;
        });

        await this.ctx.portfolioDefaultService.checkPortfolio(portfolioId);
        return tradeRow;
    }

    async sell(
        portfolioId: string,
        stockId: string,
        quantity: number,
        expectedPrice: number,
    ): Promise<TradeRecord> {
        const [p, price] = await Promise.all([
            this.getById(portfolioId),
            this.verifyExpectedPrice(stockId, expectedPrice),
        ]);

        if (p.status === 'DEFAULTED') throw new PortfolioDefaultedError(portfolioId);

        const holdings = await this.ctx.tradesService.getHoldingsByPortfolioId(portfolioId);
        const holding = holdings.find((h) => h.stockId === stockId);
        const available = holding?.quantity ?? 0;

        if (available < quantity) throw new InsufficientHoldingsError(stockId, available, quantity);

        const proceeds = quantity * price;

        const tradeRow = await this.ctx.db.transaction(async (tx) => {
            const row = await this.ctx.tradesService.executeSell(portfolioId, stockId, quantity, price, tx);

            await tx
                .update(portfolio)
                .set({ cashBalance: (parseFloat(p.cashBalance) + proceeds).toFixed(2) })
                .where(eq(portfolio.id, portfolioId));

            return row;
        });

        await this.ctx.portfolioDefaultService.checkPortfolio(portfolioId);
        return tradeRow;
    }
}
