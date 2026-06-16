import { and, asc, eq } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { trade } from '../../db/schema/trade/trade.ts';
import { isMarketDebugEnabled } from '../../lib/market-debug.ts';

export type PerformanceGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PerformancePoint = {
    date: string;
    value: number;
};

const toUtcDateIso = (date: Date): string => date.toISOString().slice(0, 10);

const startOfUtcDay = (date: Date): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

const addUtcDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

const endOfUtcDay = (isoDate: string): Date => new Date(`${isoDate}T23:59:59.999Z`);

const windowDays: Record<PerformanceGranularity, number | null> = {
    daily: null,
    weekly: 7,
    monthly: 30,
    yearly: 365,
};

const filterToWindow = (
    points: PerformancePoint[],
    granularity: PerformanceGranularity,
): PerformancePoint[] => {
    const days = windowDays[granularity];
    if (days === null || points.length === 0) return points;

    const endDate = points[points.length - 1]!.date;
    const end = startOfUtcDay(new Date(`${endDate}T12:00:00.000Z`));
    const cutoff = addUtcDays(end, -(days - 1));
    const cutoffIso = toUtcDateIso(cutoff);

    return points.filter((p) => p.date >= cutoffIso);
};

export class PortfolioPerformanceService {
    constructor(private readonly ctx: AppVars) {}

    async getPerformance(
        portfolioId: string,
        granularity: PerformanceGranularity = 'daily',
    ): Promise<PerformancePoint[]> {
        const portfolio = await this.ctx.portfolioService.getById(portfolioId);
        const startingCapital = parseFloat(portfolio.startingCapital);

        const trades = await this.ctx.db
            .select()
            .from(trade)
            .where(and(eq(trade.portfolioId, portfolioId), eq(trade.status, 'EXECUTED')))
            .orderBy(asc(trade.executedAt));

        const start = startOfUtcDay(portfolio.createdAt);
        const end = isMarketDebugEnabled()
            ? startOfUtcDay(this.ctx.marketDebugService.getMarketDate())
            : startOfUtcDay(new Date());

        const daily: PerformancePoint[] = [];
        let tradeIdx = 0;
        let cash = startingCapital;
        const holdings = new Map<string, number>();

        for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) {
            const dayIso = toUtcDateIso(cursor);
            const dayEnd = endOfUtcDay(dayIso);

            while (tradeIdx < trades.length) {
                const t = trades[tradeIdx]!;
                const executedAt = t.executedAt ?? t.createdAt;
                if (executedAt > dayEnd) break;

                const price = parseFloat(t.executedPrice);
                const qty = t.quantity;

                if (t.tradeType === 'BUY') {
                    cash -= qty * price;
                    holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) + qty);
                } else {
                    cash += qty * price;
                    holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) - qty);
                }

                tradeIdx += 1;
            }

            let holdingsValue = 0;
            for (const [stockId, quantity] of holdings) {
                if (quantity <= 0) continue;
                const price = await this.ctx.stockService.getLatestPriceByStockId(stockId, dayEnd);
                if (price !== null) holdingsValue += quantity * price;
            }

            daily.push({ date: dayIso, value: cash + holdingsValue });
        }

        return filterToWindow(daily, granularity);
    }
}
