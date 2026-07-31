/**
 * Purpose: Calculate Berlin-time market-session boundaries shared by price windows and charts.
 */
export const MARKET_TIMEZONE = 'Europe/Berlin';
export const MARKET_OPEN_HOUR = 7;
export const MARKET_CLOSE_HOUR = 20;

export function zonedWallTimeToUtc(
	isoDate: string,
	hours: number,
	minutes: number,
	timeZone = MARKET_TIMEZONE
): number {
	const [year, month, day] = isoDate.split('-').map(Number);
	let utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat('en-US', {
				timeZone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
				.formatToParts(new Date(utcGuess))
				.map((part) => [part.type, part.value])
		);

		const asShown = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute)
		);
		const wanted = Date.UTC(year, month - 1, day, hours, minutes);
		utcGuess += wanted - asShown;
	}

	return utcGuess;
}

export function getMarketSessionBounds(
	marketDateIso: string,
	nowMs = Date.now()
): { startMs: number; endMs: number } {
	const startMs = zonedWallTimeToUtc(marketDateIso, MARKET_OPEN_HOUR, 0);
	const closeMs = zonedWallTimeToUtc(marketDateIso, MARKET_CLOSE_HOUR, 0);
	return {
		startMs,
		endMs: Math.min(nowMs, closeMs)
	};
}

export function formatMarketTime(isoOrMs: string | number): string {
	const date = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
	return date.toLocaleTimeString('en-GB', {
		timeZone: MARKET_TIMEZONE,
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function marketSessionOpenIso(marketDateIso: string): string {
	return new Date(zonedWallTimeToUtc(marketDateIso, MARKET_OPEN_HOUR, 0)).toISOString();
}
