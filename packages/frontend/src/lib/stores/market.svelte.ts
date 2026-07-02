import type { BackendStockSummary } from '$lib/api/backend-types';
import { api, parseApiData } from '$lib/api/client';
import { mapStockSummary } from '$lib/api/mappers';
import { getCachedStockDetail } from '$lib/stores/stock-detail-cache';
import { mockStocks } from '$lib/mock/stocks';
import type { Stock } from '$lib/types';

function withPerformanceMetrics(stock: Stock, periodChangePercent: number | null | undefined): Stock {
	if (periodChangePercent == null) {
		return stock;
	}

	const displayPercent = periodChangePercent;
	const displayChange = stock.currentPrice - stock.currentPrice / (1 + displayPercent / 100);

	return {
		...stock,
		dayChange: displayChange,
		dayChangePercent: displayPercent,
		periodChangePercent
	};
}

function enrichStockSummary(row: BackendStockSummary, previous?: Stock): Stock {
	const mapped = mapStockSummary(row);
	if (mapped.periodChangePercent != null) {
		return mapped;
	}

	if (previous?.periodChangePercent != null) {
		return withPerformanceMetrics(mapped, previous.periodChangePercent);
	}

	const cachedDetail = getCachedStockDetail(mapped.ticker);
	if (cachedDetail?.performance.periodChangePercent != null) {
		return withPerformanceMetrics(mapped, cachedDetail.performance.periodChangePercent);
	}

	return mapped;
}

class MarketStore {
	stocks = $state<Stock[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	private loadInFlight: Promise<void> | null = null;

	trending = $derived(
		[...this.stocks]
			.sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent))
			.slice(0, 6)
	);

	async load(options?: { silent?: boolean }) {
		if (this.loadInFlight) {
			return this.loadInFlight;
		}

		this.loadInFlight = this.fetchStocks(options).finally(() => {
			this.loadInFlight = null;
		});
		return this.loadInFlight;
	}

	private async fetchStocks(options?: { silent?: boolean }) {
		const silent = options?.silent ?? false;
		if (!silent) {
			this.loading = true;
		}
		this.error = null;
		try {
			const res = await api.api.v1.stocks.$get();
			const rows = await parseApiData<BackendStockSummary[]>(res);
			const previousByTicker = new Map(this.stocks.map((stock) => [stock.ticker, stock]));
			this.stocks = rows.map((row) =>
				enrichStockSummary(row, previousByTicker.get(row.ticker))
			);
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

	applyDetailMetrics(
		ticker: string,
		metrics: {
			currentPrice: number;
			dayChange: number | null;
			dayChangePercent: number | null;
			periodChangePercent: number | null;
		}
	) {
		this.stocks = this.stocks.map((stock) => {
			if (stock.ticker !== ticker) {
				return stock;
			}

			const next = { ...stock, currentPrice: metrics.currentPrice };
			if (metrics.periodChangePercent != null) {
				return withPerformanceMetrics(next, metrics.periodChangePercent);
			}

			return {
				...next,
				dayChange: metrics.dayChange ?? 0,
				dayChangePercent: metrics.dayChangePercent ?? 0
			};
		});
	}
}

export const marketStore = new MarketStore();
