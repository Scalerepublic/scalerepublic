import { getEffectiveMarketDate } from '$lib/demo-market-date';
import { getMarketSessionBounds } from '$lib/market-session';

export interface PerformancePoint {
	date: string;
	value: number;
}

export type PerformanceGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PerformanceChartMode = 'portfolio' | 'stock';

export const granularityWindowDays: Record<PerformanceGranularity, number> = {
	daily: 1,
	weekly: 7,
	monthly: 30,
	yearly: 365
};

export const granularityLabels: Record<PerformanceGranularity, string> = {
	daily: '1 Day',
	weekly: '1 Week',
	monthly: '1 Month',
	yearly: '1 Year'
};

export const granularityPeriodLabels: Record<PerformanceGranularity, string> = {
	daily: 'past day',
	weekly: 'past week',
	monthly: 'past month',
	yearly: 'past year'
};

export function getPerformanceWindowEndIso(): string {
	return getEffectiveMarketDate();
}

export function getPerformanceWindowBounds(granularity: PerformanceGranularity): {
	startMs: number;
	endMs: number;
	startIso: string;
	endIso: string;
} {
	const endIso = getPerformanceWindowEndIso();

	if (granularity === 'daily') {
		const { startMs, endMs } = getMarketSessionBounds(endIso);
		return { startMs, endMs, startIso: endIso, endIso };
	}

	const days = granularityWindowDays[granularity];
	const endMs = new Date(`${endIso}T23:59:59.999Z`).getTime();
	const startMs = new Date(`${endIso}T00:00:00.000Z`).getTime() - (days - 1) * 86_400_000;
	return {
		startMs,
		endMs,
		startIso: new Date(startMs).toISOString().slice(0, 10),
		endIso
	};
}

export function parsePerformancePointMs(date: string): number {
	if (date.length === 10) {
		return new Date(`${date}T12:00:00.000Z`).getTime();
	}
	return new Date(date).getTime();
}

export function filterPerformanceByGranularity(
	points: PerformancePoint[],
	granularity: PerformanceGranularity
): PerformancePoint[] {
	if (points.length === 0) {
		return points;
	}

	const { startMs, endMs } = getPerformanceWindowBounds(granularity);

	return points
		.filter((point) => {
			const ms = parsePerformancePointMs(point.date);
			return ms >= startMs && ms <= endMs;
		})
		.sort(
			(left, right) => parsePerformancePointMs(left.date) - parsePerformancePointMs(right.date)
		);
}

export function initialPerformanceHistory(
	startingCapital: number,
	currentValue: number,
	date = new Date().toISOString().slice(0, 10)
): PerformancePoint[] {
	if (currentValue === startingCapital) {
		return [{ date, value: currentValue }];
	}

	return [
		{ date, value: startingCapital },
		{ date, value: currentValue }
	];
}
