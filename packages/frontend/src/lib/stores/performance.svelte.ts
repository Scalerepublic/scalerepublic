import { api, parseApiData } from '$lib/api/client';
import type { BackendPerformancePoint } from '$lib/api/backend-types';
import { authStore } from '$lib/stores/auth.svelte';
import type { PerformancePoint } from '$lib/performance-history';

export type PerformanceGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

class PerformanceStore {
	data = $state<PerformancePoint[]>([]);
	granularity = $state<PerformanceGranularity>('daily');
	loading = $state(false);
	error = $state<string | null>(null);

	async load(userId?: string) {
		const id = userId ?? authStore.user?.id;
		if (!id) {
			this.data = [];
			return;
		}

		this.loading = true;
		this.error = null;
		try {
			const res = await api.api.v1.users[':id'].performance.$get({
				param: { id },
				query: { granularity: this.granularity }
			});
			this.data = await parseApiData<BackendPerformancePoint[]>(res);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load performance';
			this.data = [];
		} finally {
			this.loading = false;
		}
	}

	setGranularity(next: PerformanceGranularity) {
		if (this.granularity === next) return;
		this.granularity = next;
	}
}

export const performanceStore = new PerformanceStore();
