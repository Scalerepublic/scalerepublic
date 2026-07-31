/**
 * Purpose: Expose portfolio-performance queries for a reactive selected time range.
 */
import { createQuery } from '@tanstack/svelte-query';

import { performanceQuery } from '$lib/api/queries';
import { authStore } from '$lib/stores/auth.svelte';
import type { PerformanceGranularity } from '$lib/performance-history';

export function getPerformance(granularity: () => PerformanceGranularity) {
	const query = createQuery(() => performanceQuery(authStore.user?.id, granularity()));

	return {
		get data() {
			return query.data ?? [];
		},
		get isLoading() {
			return query.isLoading;
		}
	};
}
