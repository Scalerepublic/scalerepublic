import type { BackendStockDetail } from '$lib/api/backend-types';

const cache = new Map<string, BackendStockDetail>();

export function getCachedStockDetail(ticker: string): BackendStockDetail | undefined {
	return cache.get(ticker);
}

export function setCachedStockDetail(ticker: string, detail: BackendStockDetail): void {
	cache.set(ticker, detail);
}
