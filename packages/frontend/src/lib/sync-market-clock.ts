/**
 * Purpose: Keep the UI's simulated market clock aligned with backend debug state.
 */
import { setDemoMarketDate } from '$lib/demo-market-date';

type MarketClock = {
	marketDate: string;
	dayOffset: number;
	simulated: boolean;
};

const CACHE_TTL_MS = Number(import.meta.env.VITE_MARKET_CLOCK_CACHE_TTL_MS ?? 60_000);

let cached: { clock: MarketClock; fetchedAt: number } | null = null;
let syncInFlight: Promise<void> | null = null;

export async function syncMarketClock(options?: { force?: boolean }): Promise<void> {
	if (syncInFlight) {
		return syncInFlight;
	}

	syncInFlight = (async () => {
		if (!options?.force && cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
			setDemoMarketDate(cached.clock.simulated ? cached.clock.marketDate : null);
			return;
		}

		try {
			const res = await fetch('/api/v1/market/clock', { credentials: 'include' });
			if (!res.ok) {
				setDemoMarketDate(null);
				return;
			}
			const json = (await res.json()) as { data?: MarketClock };
			const clock = json.data;
			if (!clock?.simulated) {
				setDemoMarketDate(null);
				return;
			}
			cached = { clock, fetchedAt: Date.now() };
			setDemoMarketDate(clock.marketDate);
		} catch {
			setDemoMarketDate(null);
		}
	})().finally(() => {
		syncInFlight = null;
	});

	return syncInFlight;
}
