import { api, parseApiData } from '$lib/api/client';
import type { BackendLeaderboardEntry } from '$lib/api/backend-types';
import { mapLeaderboardEntry } from '$lib/api/mappers';
import type { ApiLeaderboardEntry } from '$lib/types';

export async function load() {
	try {
		const res = await api.api.v1.leaderboard.$get({ query: { limit: '50' } });
		const rows = await parseApiData<BackendLeaderboardEntry[]>(res);
		return { leaderboard: rows.map(mapLeaderboardEntry) };
	} catch {
		return { leaderboard: [] as ApiLeaderboardEntry[] };
	}
}
