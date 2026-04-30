import { mockStocks } from '$lib/mock/stocks';
import type { Stock } from '$lib/types';

class MarketStore {
	stocks = $state<Stock[]>(mockStocks);

	trending = $derived(
		[...this.stocks]
			.sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent))
			.slice(0, 6)
	);

	search(query: string): Stock[] {
		const q = query.toLowerCase().trim();
		if (!q) return this.stocks;
		return this.stocks.filter(
			(s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
		);
	}
}

export const marketStore = new MarketStore();
