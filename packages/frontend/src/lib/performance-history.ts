export interface PerformancePoint {
	date: string;
	value: number;
}

export type PerformanceGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

const windowDays: Record<PerformanceGranularity, number | null> = {
	daily: null,
	weekly: 7,
	monthly: 30,
	yearly: 365
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

export function filterPerformanceByGranularity(
	points: PerformancePoint[],
	granularity: PerformanceGranularity
): PerformancePoint[] {
	const days = windowDays[granularity];
	if (days === null || points.length === 0) {
		return points;
	}

	const endDate = points[points.length - 1]!.date;
	const end = startOfUtcDay(new Date(`${endDate}T12:00:00.000Z`));
	const cutoffIso = addUtcDays(end, -(days - 1)).toISOString().slice(0, 10);

	return points.filter((point) => point.date >= cutoffIso);
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
