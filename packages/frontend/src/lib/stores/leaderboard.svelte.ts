import { api, parseApiData } from '$lib/api/client';
import type { BackendLeaderboardEntry } from '$lib/api/backend-types';
import { mapLeaderboardEntry } from '$lib/api/mappers';
import type { ApiLeaderboardEntry } from '$lib/types';

class LeaderboardStore {
	entries = $state<ApiLeaderboardEntry[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	async load(options?: { silent?: boolean }) {
		const silent = options?.silent ?? false;
		if (!silent) {
			this.loading = true;
		}
		this.error = null;
		try {
			const res = await api.api.v1.leaderboard.$get({ query: { limit: '50' } });
			const rows = await parseApiData<BackendLeaderboardEntry[]>(res);
			this.entries = rows.map(mapLeaderboardEntry);
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load leaderboard';
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}
}

export const leaderboardStore = new LeaderboardStore();
