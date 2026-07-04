import type {
	BackendMarketSector,
	BackendMarketSectorCatalog,
	BackendStockListResponse,
	BackendStockSummary
} from '$lib/api/backend-types';
import {
	API_CACHE_TTL_MS,
	buildStocksListCacheKey,
	getApiCache,
	setApiCache
} from '$lib/api-cache';
import { api, parseApiData } from '$lib/api/client';
import { mapStockSummary } from '$lib/api/mappers';
import { getCachedStockDetail } from '$lib/stores/stock-detail-cache';
import type { Stock } from '$lib/types';

const TRENDING_CACHE_KEY = 'v1/stocks/trending';
const SECTORS_CACHE_KEY = 'v1/stocks/sectors';
const PAGE_SIZE = 24;

export type MarketBrowseState = {
	items: Stock[];
	total: number;
	page: number;
	limit: number;
	sector?: string;
	q?: string;
};

function withPerformanceMetrics(
	stock: Stock,
	periodChangePercent: number | null | undefined
): Stock {
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
	trending = $state<Stock[]>([]);
	sectors = $state<BackendMarketSector[]>([]);
	totalListings = $state(0);
	browse = $state<MarketBrowseState | null>(null);
	loadingTrending = $state(false);
	loadingBrowse = $state(false);
	loadingSectors = $state(false);
	error = $state<string | null>(null);

	private stockIndex = new Map<string, Stock>();
	private trendingInFlight: Promise<void> | null = null;
	private sectorsInFlight: Promise<void> | null = null;
	private browseInFlight: Promise<void> | null = null;
	private browseRequestId = 0;

	private rememberStocks(stocks: Stock[]) {
		for (const stock of stocks) {
			this.stockIndex.set(stock.id, stock);
			this.stockIndex.set(stock.ticker, stock);
		}
	}

	private mapRows(rows: BackendStockSummary[]): Stock[] {
		return rows.map((row) => enrichStockSummary(row, this.stockIndex.get(row.ticker)));
	}

	findStock(idOrTicker: string): Stock | undefined {
		return this.stockIndex.get(idOrTicker);
	}

	async loadTrending(options?: { silent?: boolean; force?: boolean }) {
		if (this.trendingInFlight) {
			return this.trendingInFlight;
		}

		this.trendingInFlight = this.fetchTrending(options).finally(() => {
			this.trendingInFlight = null;
		});
		return this.trendingInFlight;
	}

	async loadSectors(options?: { force?: boolean }) {
		if (this.sectorsInFlight) {
			return this.sectorsInFlight;
		}

		this.sectorsInFlight = this.fetchSectors(options).finally(() => {
			this.sectorsInFlight = null;
		});
		return this.sectorsInFlight;
	}

	async browseStocks(options: {
		sector?: string;
		q?: string;
		page?: number;
		limit?: number;
		silent?: boolean;
		force?: boolean;
	}) {
		const requestId = ++this.browseRequestId;
		const run = this.fetchBrowse(options, requestId).finally(() => {
			if (this.browseRequestId === requestId) {
				this.browseInFlight = null;
			}
		});
		this.browseInFlight = run;
		return run;
	}

	async load(options?: { silent?: boolean; force?: boolean }) {
		await Promise.all([this.loadTrending(options), this.loadSectors({ force: options?.force })]);
	}

	private async fetchTrending(options?: { silent?: boolean; force?: boolean }) {
		const silent = options?.silent ?? false;
		const force = options?.force ?? false;

		if (!force) {
			const cached = getApiCache<BackendStockSummary[]>(
				TRENDING_CACHE_KEY,
				API_CACHE_TTL_MS.stocksTrending
			);
			if (cached !== null) {
				this.trending = this.mapRows(cached);
				this.rememberStocks(this.trending);
				this.error = null;
				return;
			}
		}

		if (!silent) {
			this.loadingTrending = true;
		}

		try {
			const res = await api.api.v1.stocks.trending.$get({ query: { limit: '6' } });
			const rows = await parseApiData<BackendStockSummary[]>(res);
			setApiCache(TRENDING_CACHE_KEY, rows);
			this.trending = this.mapRows(rows);
			this.rememberStocks(this.trending);
			this.error = null;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load trending stocks';
		} finally {
			if (!silent) {
				this.loadingTrending = false;
			}
		}
	}

	private async fetchSectors(options?: { force?: boolean }) {
		const force = options?.force ?? false;

		if (!force) {
			const cached = getApiCache<BackendMarketSectorCatalog>(
				SECTORS_CACHE_KEY,
				API_CACHE_TTL_MS.stocksSectors
			);
			if (cached !== null) {
				this.sectors = cached.sectors;
				this.totalListings = cached.totalListings;
				return;
			}
		}

		this.loadingSectors = true;
		try {
			const res = await api.api.v1.stocks.sectors.$get();
			const catalog = await parseApiData<BackendMarketSectorCatalog>(res);
			setApiCache(SECTORS_CACHE_KEY, catalog);
			this.sectors = catalog.sectors;
			this.totalListings = catalog.totalListings;
		} catch {
			if (this.sectors.length === 0) {
				this.sectors = [];
				this.totalListings = 0;
			}
		} finally {
			this.loadingSectors = false;
		}
	}

	private async fetchBrowse(
		options: {
			sector?: string;
			q?: string;
			page?: number;
			limit?: number;
			silent?: boolean;
			force?: boolean;
		},
		requestId: number
	) {
		const silent = options.silent ?? false;
		const force = options.force ?? false;
		const page = options.page ?? 1;
		const limit = options.limit ?? PAGE_SIZE;
		const q = options.q?.trim() || undefined;
		const sector = options.sector?.trim() || undefined;
		const cacheKey = buildStocksListCacheKey({ q, sector, page, limit });

		if (!force) {
			const cached = getApiCache<BackendStockListResponse>(cacheKey, API_CACHE_TTL_MS.stocksList);
			if (cached !== null) {
				if (requestId !== this.browseRequestId) {
					return;
				}
				const items = this.mapRows(cached.items);
				this.browse = {
					items,
					total: cached.total,
					page: cached.page,
					limit: cached.limit,
					sector,
					q
				};
				this.rememberStocks(items);
				return;
			}
		}

		if (!silent) {
			this.loadingBrowse = true;
		}

		try {
			const res = await api.api.v1.stocks.$get({
				query: {
					page: String(page),
					limit: String(limit),
					...(q ? { q } : {}),
					...(sector ? { sector } : {})
				}
			});
			if (requestId !== this.browseRequestId) {
				return;
			}
			const payload = await parseApiData<BackendStockListResponse>(res);
			setApiCache(cacheKey, payload);
			const items = this.mapRows(payload.items);
			this.browse = {
				items,
				total: payload.total,
				page: payload.page,
				limit: payload.limit,
				sector,
				q
			};
			this.rememberStocks(items);
		} catch (e) {
			if (requestId !== this.browseRequestId) {
				return;
			}
			this.error = e instanceof Error ? e.message : 'Failed to load stocks';
		} finally {
			if (requestId === this.browseRequestId && !silent) {
				this.loadingBrowse = false;
			}
		}
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
		const patch = (stock: Stock): Stock => {
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
		};

		this.trending = this.trending.map(patch);
		if (this.browse) {
			this.browse = {
				...this.browse,
				items: this.browse.items.map(patch)
			};
		}

		const indexed = this.stockIndex.get(ticker);
		if (indexed) {
			const updated = patch(indexed);
			this.stockIndex.set(updated.id, updated);
			this.stockIndex.set(updated.ticker, updated);
		}
	}
}

export const marketStore = new MarketStore();
export const MARKET_PAGE_SIZE = PAGE_SIZE;
