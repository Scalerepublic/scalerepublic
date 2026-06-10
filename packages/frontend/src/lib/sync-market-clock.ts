import { setDemoMarketDate } from '$lib/demo-market-date';

type MarketClock = {
	marketDate: string;
	dayOffset: number;
	simulated: boolean;
};

export async function syncMarketClock(): Promise<void> {
	try {
		const res = await fetch('/api/v1/market/clock', { credentials: 'include' });
		if (!res.ok) {
			setDemoMarketDate(null);
			return;
		}
		const json = (await res.json()) as { data?: MarketClock };
		const clock = json.data;
		if (!clock) {
			setDemoMarketDate(null);
			return;
		}
		setDemoMarketDate(clock.simulated || clock.dayOffset !== 0 ? clock.marketDate : null);
	} catch {
		setDemoMarketDate(null);
	}
}
