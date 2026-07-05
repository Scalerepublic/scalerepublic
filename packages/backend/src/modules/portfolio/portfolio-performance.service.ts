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

    return points.filter((p) => {
        const pointIso = p.date.length === 10 ? p.date : toUtcDateIso(new Date(p.date));
        return pointIso >= cutoffIso && pointIso <= endIso;
    });
};

type PriceTracker = {
    pointer: number;
    latestPrice: number | null;
};

type ExecutedTrade = typeof trade.$inferSelect;

export class PortfolioPerformanceService {
    constructor(private readonly ctx: AppVars) {}

    private priceAt(
        stockId: string,
        at: Date,
        priceSeries: Map<string, Array<{ recordedAt: Date; price: number }>>,
        trackers: Map<string, PriceTracker>,
    ): number | null {
        const series = priceSeries.get(stockId) ?? [];
        const tracker = trackers.get(stockId) ?? { pointer: 0, latestPrice: null };

        while (tracker.pointer < series.length && series[tracker.pointer]!.recordedAt <= at) {
            tracker.latestPrice = series[tracker.pointer]!.price;
            tracker.pointer += 1;
        }

        trackers.set(stockId, tracker);
        return tracker.latestPrice;
    }

    private holdingsValueAt(
        holdings: Map<string, number>,
        at: Date,
        priceSeries: Map<string, Array<{ recordedAt: Date; price: number }>>,
        trackers: Map<string, PriceTracker>,
    ): number {
        let total = 0;
        for (const [stockId, quantity] of holdings) {
            if (quantity <= 0) continue;
            const price = this.priceAt(stockId, at, priceSeries, trackers);
            if (price !== null) total += quantity * price;
        }
        return total;
    }

    private applyTrade(
        holdings: Map<string, number>,
        cash: number,
        t: ExecutedTrade,
    ): number {
        const price = parseFloat(t.executedPrice);
        const qty = t.quantity;

        if (t.tradeType === 'BUY') {
            cash -= qty * price;
            holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) + qty);
        } else {
            cash += qty * price;
            holdings.set(t.stockId, (holdings.get(t.stockId) ?? 0) - qty);
        }

        return cash;
    }

    private replayPortfolioAt(
        startingCapital: number,
        trades: ExecutedTrade[],
        at: Date,
    ): { cash: number; holdings: Map<string, number> } {
        let cash = startingCapital;
        const holdings = new Map<string, number>();

        for (const t of trades) {
            const executedAt = t.executedAt ?? t.createdAt;
            if (executedAt > at) break;
            cash = this.applyTrade(holdings, cash, t);
        }

        return { cash, holdings };
    }

    private async getIntradayPerformance(
        startingCapital: number,
        trades: ExecutedTrade[],
        end: Date,
    ): Promise<PerformancePoint[]> {
        const dayStart = startOfUtcDay(end);
        const dayEnd = endOfUtcDay(toUtcDateIso(end));

        const { cash: openingCash, holdings: openingHoldings } = this.replayPortfolioAt(
            startingCapital,
            trades,
            new Date(dayStart.getTime() - 1),
        );

        const stockIdsSet = new Set(
            [...openingHoldings.entries()]
                .filter(([, quantity]) => quantity > 0)
                .map(([stockId]) => stockId)
        );
        for (const t of trades) {
            const executedAt = t.executedAt ?? t.createdAt;
            if (executedAt >= dayStart && executedAt <= dayEnd) {
                stockIdsSet.add(t.stockId);
            }
        }
        const stockIds = [...stockIdsSet];

        const priceSeries = stockIds.length > 0
            ? await this.ctx.stockService.getPriceSnapshotsByStockIds(stockIds, dayStart, dayEnd)
            : new Map<string, Array<{ recordedAt: Date; price: number }>>();

        const eventTimes = new Set<number>([dayStart.getTime()]);
        for (const t of trades) {
            const executedAt = t.executedAt ?? t.createdAt;
            if (executedAt >= dayStart && executedAt <= dayEnd) {
                eventTimes.add(executedAt.getTime());
            }
        }
        for (const series of priceSeries.values()) {
            for (const point of series) {
                eventTimes.add(point.recordedAt.getTime());
            }
        }
        eventTimes.add(Math.min(end.getTime(), dayEnd.getTime()));

        const sortedTimes = [...eventTimes].sort((left, right) => left - right);
        const holdings = new Map(openingHoldings);
        let cash = openingCash;
        let tradeIdx = 0;
        while (tradeIdx < trades.length) {
            const executedAt = trades[tradeIdx]!.executedAt ?? trades[tradeIdx]!.createdAt;
            if (executedAt >= dayStart) break;
            tradeIdx += 1;
        }
        const priceTrackers = new Map<string, PriceTracker>();
        const points: PerformancePoint[] = [];

        for (const timestamp of sortedTimes) {
            const at = new Date(timestamp);

            while (tradeIdx < trades.length) {
                const t = trades[tradeIdx]!;
                const executedAt = t.executedAt ?? t.createdAt;
                if (executedAt > at) break;
                cash = this.applyTrade(holdings, cash, t);
                tradeIdx += 1;
            }

            const value = cash + this.holdingsValueAt(holdings, at, priceSeries, priceTrackers);
            points.push({ date: at.toISOString(), value });
        }

        return points;
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

        const end = isMarketDebugEnabled()
            ? startOfUtcDay(this.ctx.marketDebugService.getMarketDate())
            : startOfUtcDay(new Date());

        if (granularity === 'daily') {
            return filterToWindow(
                await this.getIntradayPerformance(startingCapital, trades, end),
                granularity,
                end,
            );
        }

        const stockIds = [...new Set(trades.map((row) => row.stockId))];
        const priceSeries = stockIds.length > 0
            ? await this.ctx.stockService.getPriceSnapshotsByStockIds(stockIds, startOfUtcDay(portfolio.createdAt), endOfUtcDay(toUtcDateIso(end)))
            : new Map<string, Array<{ recordedAt: Date; price: number }>>();
        const priceTrackers = new Map<string, PriceTracker>();

        const daily: PerformancePoint[] = [];
        let tradeIdx = 0;
        let cash = startingCapital;
        const holdings = new Map<string, number>();
        const start = startOfUtcDay(portfolio.createdAt);

        for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) {
            const dayIso = toUtcDateIso(cursor);
            const dayEnd = endOfUtcDay(dayIso);

            while (tradeIdx < trades.length) {
                const t = trades[tradeIdx]!;
                const executedAt = t.executedAt ?? t.createdAt;
                if (executedAt > dayEnd) break;

                cash = this.applyTrade(holdings, cash, t);
                tradeIdx += 1;
            }

            const holdingsValue = this.holdingsValueAt(holdings, dayEnd, priceSeries, priceTrackers);
            daily.push({ date: dayIso, value: cash + holdingsValue });
        }

        return filterToWindow(daily, granularity, end);
    }
}
