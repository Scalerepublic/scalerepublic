import { eq } from 'drizzle-orm';

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
} from './errors.ts';

export type Portfolio = typeof portfolio.$inferSelect;

const DEFAULT_STARTING_CAPITAL = '1000.00';

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
            .where(eq(portfolio.userId, userId));
    }

    async ensureForUser(userId: string): Promise<Portfolio> {
        const existing = await this.getByUserId(userId);
        if (existing[0]) return existing[0];

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

        return this.ctx.db.transaction(async (tx) => {
            const tradeRow = await this.ctx.tradesService.executeBuy(portfolioId, stockId, quantity, price, tx);

            await tx
                .update(portfolio)
                .set({ cashBalance: (cashBalance - cost).toFixed(2) })
                .where(eq(portfolio.id, portfolioId));

            return tradeRow;
        });
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

        return this.ctx.db.transaction(async (tx) => {
            const tradeRow = await this.ctx.tradesService.executeSell(portfolioId, stockId, quantity, price, tx);

            await tx
                .update(portfolio)
                .set({ cashBalance: (parseFloat(p.cashBalance) + proceeds).toFixed(2) })
                .where(eq(portfolio.id, portfolioId));

            return tradeRow;
        });
    }
}
