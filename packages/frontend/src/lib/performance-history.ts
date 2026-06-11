export interface PerformancePoint {
	date: string;
	value: number;
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
