import { api, parseApiData } from '$lib/api/client';
import type { BackendPerformancePoint } from '$lib/api/backend-types';
import { authStore } from '$lib/stores/auth.svelte';
import type { PerformanceGranularity, PerformancePoint } from '$lib/performance-history';

export type { PerformanceGranularity };

class PerformanceStore {
	data = $state<PerformancePoint[]>([]);
	granularity = $state<PerformanceGranularity>('daily');
	loading = $state(false);
	error = $state<string | null>(null);
	private loadInFlight: Promise<void> | null = null;
	private loadInFlightKey: string | null = null;

	async load(userId?: string, options?: { silent?: boolean }) {
		const id = userId ?? authStore.user?.id;
		if (!id) {
			this.data = [];
			return;
		}

		const requestKey = `${id}:${this.granularity}`;
		if (this.loadInFlight && this.loadInFlightKey === requestKey) {
			return this.loadInFlight;
		}

		const silent = options?.silent ?? false;
		this.loadInFlightKey = requestKey;
		this.loadInFlight = this.fetchPerformance(id, silent).finally(() => {
			this.loadInFlight = null;
			this.loadInFlightKey = null;
		});
		return this.loadInFlight;
	}

	private async fetchPerformance(userId: string, silent: boolean) {
		if (!silent) {
			this.loading = true;
		}
		this.error = null;
		try {
			const res = await api.api.v1.users[':id'].performance.$get({
				param: { id: userId },
				query: { granularity: this.granularity }
			});
			this.data = await parseApiData<BackendPerformancePoint[]>(res);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load performance';
			this.data = [];
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}

	setGranularity(next: PerformanceGranularity) {
		if (this.granularity === next) return;
		this.granularity = next;
	}
}

export const performanceStore = new PerformanceStore();
