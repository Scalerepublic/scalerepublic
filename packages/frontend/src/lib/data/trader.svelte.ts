/**
 * Purpose: Combine a public trader's profile, portfolio, and performance queries.
 */
import { createQuery } from '@tanstack/svelte-query';

import { portfolioView } from '$lib/data/portfolio-view';
import { traderPerformanceQuery, traderPortfolioQuery, traderProfileQuery } from '$lib/api/queries';
import { authStore } from '$lib/stores/auth.svelte';
import type { PerformanceGranularity } from '$lib/performance-history';

export function getTrader(id: () => string, granularity: () => PerformanceGranularity) {
	const profileQuery = createQuery(() => traderProfileQuery(id()));
	const portfolioQuery = createQuery(() => traderPortfolioQuery(id()));
	const performanceQuery = createQuery(() => traderPerformanceQuery(id(), granularity()));
	const view = $derived(portfolioView(portfolioQuery.data));

	return {
		get profile() {
			return profileQuery.data;
		},
		get notFound() {
			return profileQuery.isError;
		},
		get isCurrentUser() {
			return profileQuery.data?.userId === authStore.user?.id;
		},
		get holdings() {
			return view.holdings;
		},
		get summary() {
			return view.summary;
		},
		get performance() {
			return performanceQuery.data ?? [];
		},
		get performanceLoading() {
			return performanceQuery.isLoading;
		}
	};
}
