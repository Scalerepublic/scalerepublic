import { and, asc, eq } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { trade } from '../../db/schema/trade/trade.ts';

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

const weekKey = (isoDate: string): string => {
    const d = new Date(`${isoDate}T12:00:00.000Z`);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const monthKey = (isoDate: string): string => isoDate.slice(0, 7);

const yearKey = (isoDate: string): string => isoDate.slice(0, 4);

const bucketKey = (isoDate: string, granularity: PerformanceGranularity): string => {
    if (granularity === 'weekly') return weekKey(isoDate);
    if (granularity === 'monthly') return monthKey(isoDate);
    if (granularity === 'yearly') return yearKey(isoDate);
    return isoDate;
};

const downsample = (
    points: PerformancePoint[],
    granularity: PerformanceGranularity,
): PerformancePoint[] => {
    if (granularity === 'daily' || points.length === 0) return points;

    const buckets = new Map<string, PerformancePoint>();
    for (const point of points) {
        buckets.set(bucketKey(point.date, granularity), point);
    }

    return [...buckets.values()];
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
        const end = startOfUtcDay(new Date());

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

        return downsample(daily, granularity);
    }
}
