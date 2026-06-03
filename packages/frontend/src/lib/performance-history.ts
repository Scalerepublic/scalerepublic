export interface PerformancePoint {
	date: string;
	value: number;
}

export function buildPerformanceHistory(
	currentValue: number,
	startingCapital: number
): PerformancePoint[] {
	const end = new Date();
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - 1);

	return [
		{ date: start.toISOString().slice(0, 10), value: startingCapital },
		{ date: end.toISOString().slice(0, 10), value: currentValue }
	];
}
