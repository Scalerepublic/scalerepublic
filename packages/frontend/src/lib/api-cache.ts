type CacheEntry<T> = {
	data: T;
	fetchedAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();

function storageKey(key: string): string {
	return `sr-api-cache:${key}`;
}

export function getApiCache<T>(key: string, ttlMs: number): T | null {
	const now = Date.now();
	const mem = memory.get(key) as CacheEntry<T> | undefined;
	if (mem !== undefined && now - mem.fetchedAt < ttlMs) {
		return mem.data;
	}

	if (typeof sessionStorage === 'undefined') {
		return null;
	}

	try {
		const raw = sessionStorage.getItem(storageKey(key));
		if (raw === null) {
			return null;
		}
		const entry = JSON.parse(raw) as CacheEntry<T>;
		if (now - entry.fetchedAt >= ttlMs) {
			return null;
		}
		memory.set(key, entry);
		return entry.data;
	} catch {
		return null;
	}
}

export function setApiCache<T>(key: string, data: T): void {
	const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
	memory.set(key, entry);

	if (typeof sessionStorage === 'undefined') {
		return;
	}

	try {
		sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
	} catch {
		// quota exceeded — in-memory cache still applies for this session
	}
}

export function clearApiCache(key?: string): void {
	if (key === undefined) {
		memory.clear();
		if (typeof sessionStorage !== 'undefined') {
			for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
				const k = sessionStorage.key(i);
				if (k?.startsWith('sr-api-cache:')) {
					sessionStorage.removeItem(k);
				}
			}
		}
		return;
	}

	memory.delete(key);
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(storageKey(key));
	}
}

export const API_CACHE_TTL_MS = {
	stocksList: Number(import.meta.env.VITE_STOCKS_LIST_CACHE_TTL_MS ?? 120_000),
	stocksTrending: Number(import.meta.env.VITE_STOCKS_TRENDING_CACHE_TTL_MS ?? 60_000),
	stocksSectors: Number(import.meta.env.VITE_STOCKS_SECTORS_CACHE_TTL_MS ?? 600_000),
	portfolio: Number(import.meta.env.VITE_PORTFOLIO_CACHE_TTL_MS ?? 15_000),
	marketClock: Number(import.meta.env.VITE_MARKET_CLOCK_CACHE_TTL_MS ?? 60_000)
} as const;

export function buildStocksListCacheKey(options: {
	q?: string;
	sector?: string;
	page: number;
	limit: number;
}): string {
	const q = options.q?.trim() || '_';
	const sector = options.sector?.trim() || 'all';
	return `v1/stocks?sector=${sector}&q=${encodeURIComponent(q)}&page=${options.page}&limit=${options.limit}`;
}
