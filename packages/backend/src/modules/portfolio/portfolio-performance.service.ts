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

const windowDays: Record<PerformanceGranularity, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365,
};

const filterToWindow = (
    points: PerformancePoint[],
    granularity: PerformanceGranularity,
    endDate: Date,
): PerformancePoint[] => {
    const days = windowDays[granularity];
    if (points.length === 0) return points;

    const end = startOfUtcDay(endDate);
    const cutoffIso = toUtcDateIso(addUtcDays(end, -(days - 1)));
    const endIso = toUtcDateIso(end);

    return points.filter((p) => p.date >= cutoffIso && p.date <= endIso);
};

type PriceTracker = {
    pointer: number;
    latestPrice: number | null;
};

export class PortfolioPerformanceService {
    constructor(private readonly ctx: AppVars) {}

    private priceAt(
        stockId: string,
        dayEnd: Date,
        priceSeries: Map<string, Array<{ recordedAt: Date; price: number }>>,
        trackers: Map<string, PriceTracker>,
    ): number | null {
        const series = priceSeries.get(stockId) ?? [];
        const tracker = trackers.get(stockId) ?? { pointer: 0, latestPrice: null };

        while (tracker.pointer < series.length && series[tracker.pointer]!.recordedAt <= dayEnd) {
            tracker.latestPrice = series[tracker.pointer]!.price;
            tracker.pointer += 1;
        }

        trackers.set(stockId, tracker);
        return tracker.latestPrice;
    }

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

        const stockIds = [...new Set(trades.map((row) => row.stockId))];
        const priceSeries = stockIds.length > 0
            ? await this.ctx.stockService.getPriceSnapshotsByStockIds(stockIds, start, endOfUtcDay(toUtcDateIso(end)))
            : new Map<string, Array<{ recordedAt: Date; price: number }>>();
        const priceTrackers = new Map<string, PriceTracker>();

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
                const price = this.priceAt(stockId, dayEnd, priceSeries, priceTrackers);
                if (price !== null) holdingsValue += quantity * price;
            }

            daily.push({ date: dayIso, value: cash + holdingsValue });
        }

        return filterToWindow(daily, granularity, end);
    }
}
