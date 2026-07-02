import { setDemoMarketDate } from '$lib/demo-market-date';

type MarketClock = {
	marketDate: string;
	dayOffset: number;
	simulated: boolean;
};

let syncInFlight: Promise<void> | null = null;

export async function syncMarketClock(): Promise<void> {
	if (syncInFlight) {
		return syncInFlight;
	}

	syncInFlight = (async () => {
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
			setDemoMarketDate(clock.marketDate);
		} catch {
			setDemoMarketDate(null);
		}
	})().finally(() => {
		syncInFlight = null;
	});

	return syncInFlight;
}
