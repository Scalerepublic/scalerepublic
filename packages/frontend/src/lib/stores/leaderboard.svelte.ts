import { api, parseApiData } from '$lib/api/client';
import type { BackendLeaderboardEntry } from '$lib/api/backend-types';
import { API_CACHE_TTL_MS, getApiCache, setApiCache } from '$lib/api-cache';
import { mapLeaderboardEntry } from '$lib/api/mappers';
import type { ApiLeaderboardEntry } from '$lib/types';

const LEADERBOARD_CACHE_KEY = 'v1/leaderboard';

class LeaderboardStore {
	entries = $state<ApiLeaderboardEntry[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	private loadInFlight: Promise<void> | null = null;

	async load(options?: { silent?: boolean; force?: boolean }) {
		if (this.loadInFlight) {
			return this.loadInFlight;
		}

		const silent = options?.silent ?? false;
		this.loadInFlight = this.fetchLeaderboard(silent, options?.force ?? false).finally(() => {
			this.loadInFlight = null;
		});
		return this.loadInFlight;
	}

	private async fetchLeaderboard(silent: boolean, force: boolean) {
		if (!force) {
			const cached = getApiCache<BackendLeaderboardEntry[]>(
				LEADERBOARD_CACHE_KEY,
				API_CACHE_TTL_MS.leaderboard
			);
			if (cached !== null) {
				this.entries = cached.map(mapLeaderboardEntry);
				if (!silent) {
					this.error = null;
				}
				return;
			}
		}

		if (!silent) {
			this.loading = true;
			this.error = null;
		}
		try {
			const res = await api.api.v1.leaderboard.$get({ query: { limit: '50' } });
			const rows = await parseApiData<BackendLeaderboardEntry[]>(res);
			setApiCache(LEADERBOARD_CACHE_KEY, rows);
			this.entries = rows.map(mapLeaderboardEntry);
			if (!silent) {
				this.error = null;
			}
		} catch (e) {
			if (!silent) {
				this.error = e instanceof Error ? e.message : 'Failed to load leaderboard';
			}
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}
}

export const leaderboardStore = new LeaderboardStore();
