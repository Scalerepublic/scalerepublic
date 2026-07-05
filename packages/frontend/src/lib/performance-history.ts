import { getEffectiveMarketDate } from '$lib/demo-market-date';

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

export function getPerformanceWindowEndIso(): string {
	return getEffectiveMarketDate();
}

export function filterPerformanceByGranularity(
	points: PerformancePoint[],
	granularity: PerformanceGranularity,
	_mode: PerformanceChartMode = 'portfolio'
): PerformancePoint[] {
	if (points.length === 0) {
		return points;
	}

	const days = granularityWindowDays[granularity];
	const endIso = getPerformanceWindowEndIso();
	const end = startOfUtcDay(new Date(`${endIso}T12:00:00.000Z`));
	const cutoffIso = addUtcDays(end, -(days - 1)).toISOString().slice(0, 10);

	return points.filter((point) => point.date >= cutoffIso && point.date <= endIso);
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
