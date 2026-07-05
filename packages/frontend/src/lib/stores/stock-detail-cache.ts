import type { BackendStockDetail } from '$lib/api/backend-types';

const DETAIL_CACHE_TTL_MS = Number(import.meta.env.VITE_STOCK_DETAIL_CACHE_TTL_MS ?? 60_000);

type CacheEntry = {
	detail: BackendStockDetail;
	fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

export function getCachedStockDetail(ticker: string): BackendStockDetail | undefined {
	const entry = cache.get(ticker);
	if (entry === undefined) {
		return undefined;
	}
	if (Date.now() - entry.fetchedAt >= DETAIL_CACHE_TTL_MS) {
		cache.delete(ticker);
		return undefined;
	}
	return entry.detail;
}

export function setCachedStockDetail(ticker: string, detail: BackendStockDetail): void {
	cache.set(ticker, { detail, fetchedAt: Date.now() });
}

export function clearCachedStockDetail(ticker?: string): void {
	if (ticker) {
		cache.delete(ticker);
		return;
	}
	cache.clear();
}
