import { API_CACHE_TTL_MS, getApiCache, setApiCache } from '$lib/api-cache';
import { setDemoMarketDate } from '$lib/demo-market-date';

type MarketClock = {
	marketDate: string;
	dayOffset: number;
	simulated: boolean;
};

const MARKET_CLOCK_CACHE_KEY = 'v1/market/clock';

let syncInFlight: Promise<void> | null = null;

export async function syncMarketClock(options?: { force?: boolean }): Promise<void> {
	if (syncInFlight) {
		return syncInFlight;
	}

	syncInFlight = (async () => {
		if (!options?.force) {
			const cached = getApiCache<MarketClock>(
				MARKET_CLOCK_CACHE_KEY,
				API_CACHE_TTL_MS.marketClock
			);
			if (cached !== null) {
				if (!cached.simulated) {
					setDemoMarketDate(null);
					return;
				}
				setDemoMarketDate(cached.marketDate);
				return;
			}
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
			setApiCache(MARKET_CLOCK_CACHE_KEY, clock);
			setDemoMarketDate(clock.marketDate);
		} catch {
			setDemoMarketDate(null);
		}
	})().finally(() => {
		syncInFlight = null;
	});

	return syncInFlight;
}
