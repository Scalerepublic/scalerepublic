import type { BackendStockSummary } from '$lib/api/backend-types';
import { api, parseApiData } from '$lib/api/client';
import { mapStockSummary } from '$lib/api/mappers';
import { mockStocks } from '$lib/mock/stocks';
import type { Stock } from '$lib/types';

class MarketStore {
	stocks = $state<Stock[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	trending = $derived(
		[...this.stocks]
			.sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent))
			.slice(0, 6)
	);

	async load(options?: { silent?: boolean }) {
		const silent = options?.silent ?? false;
		if (!silent) {
			this.loading = true;
		}
		this.error = null;
		try {
			const res = await api.api.v1.stocks.$get();
			const rows = await parseApiData<BackendStockSummary[]>(res);
			this.stocks = rows.map(mapStockSummary);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load stocks';
			this.stocks = mockStocks.map((s) => ({
				...s,
				id: `stock-${s.ticker.toLowerCase().replace('.', '-')}`
			}));
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}

	search(query: string): Stock[] {
		const q = query.toLowerCase().trim();
		if (!q) return this.stocks;
		return this.stocks.filter(
			(s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
		);
	}
}

export const marketStore = new MarketStore();
