/**
 * Purpose: Expose trending, sector, catalog, and stock-detail queries as reactive Svelte state.
 */
import { createQuery } from '@tanstack/svelte-query';

import {
	stockDetailQuery,
	stocksListQuery,
	stocksSectorsQuery,
	stocksTrendingQuery
} from '$lib/api/queries';
import type { StocksListParams } from '$lib/api/queries';

export function getTrending() {
	const query = createQuery(() => stocksTrendingQuery());

	return {
		get stocks() {
			return query.data ?? [];
		},
		get isLoading() {
			return query.isLoading;
		}
	};
}

export function getSectors() {
	const query = createQuery(() => stocksSectorsQuery());

	return {
		get sectors() {
			return query.data?.sectors ?? [];
		},
		get totalListings() {
			return query.data?.totalListings ?? 0;
		},
		get isLoading() {
			return query.isLoading;
		}
	};
}

export function getStockList(params: () => StocksListParams, enabled: () => boolean) {
	const query = createQuery(() => ({ ...stocksListQuery(params()), enabled: enabled() }));

	return {
		get result() {
			return query.data ?? null;
		},
		get isFetching() {
			return query.isFetching;
		}
	};
}

export function getStockDetail(ticker: () => string, enabled: () => boolean) {
	const query = createQuery(() => ({
		...stockDetailQuery(ticker()),
		enabled: enabled() && ticker().length > 0
	}));

	return {
		get detail() {
			return query.data ?? null;
		},
		get isLoading() {
			return query.isLoading;
		},
		get isError() {
			return query.isError;
		},
		get error() {
			return query.error;
		}
	};
}
