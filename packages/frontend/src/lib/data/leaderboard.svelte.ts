import { createQuery } from '@tanstack/svelte-query';

import { leaderboardQuery } from '$lib/api/queries';
import { authStore } from '$lib/stores/auth.svelte';

export function getLeaderboard() {
	const query = createQuery(() => leaderboardQuery());
	const entries = $derived(
		(query.data ?? []).map((entry) => ({
			...entry,
			isCurrentUser: entry.userId === authStore.user?.id
		}))
	);

	return {
		get entries() {
			return entries;
		},
		get isError() {
			return query.isError;
		},
		get error() {
			return query.error;
		}
	};
}
