/**
 * Purpose: Expose current-user profile and trader-search queries as reactive Svelte state.
 */
import { createQuery } from '@tanstack/svelte-query';

import type { BackendUserProfile } from '$lib/api/backend-types';
import { userProfileQuery, userSearchQuery } from '$lib/api/queries';
import { authStore } from '$lib/stores/auth.svelte';
import type { UserProfile } from '$lib/types';

function toIsoString(value: string | Date | undefined | null): string | undefined {
	if (!value) return undefined;
	return typeof value === 'string' ? value : value.toISOString();
}

function buildUserProfile(
	user: typeof authStore.user,
	backend: BackendUserProfile | null
): UserProfile {
	return {
		id: user?.id ?? '',
		name: backend?.name || user?.name || '',
		email: user?.email ?? '',
		avatarUrl: user?.image ?? null,
		joinedAt: toIsoString(user?.createdAt) ?? new Date().toISOString(),
		startingCapital: backend?.startingCapital,
		accountStatus: backend ? (backend.isDefaulted ? 'suspended' : 'active') : undefined,
		rank: backend?.rank ?? undefined,
		penaltyCounter: backend?.penaltyCounter
	};
}

export function getUserProfile() {
	const query = createQuery(() => userProfileQuery(authStore.user?.id));
	const profile = $derived(buildUserProfile(authStore.user, query.data ?? null));

	return {
		get profile() {
			return profile;
		},
		get isLoading() {
			return query.isLoading;
		}
	};
}

export function getUserSearch(query: () => string) {
	const search = createQuery(() => userSearchQuery(query()));

	return {
		get results() {
			return search.data ?? [];
		},
		get isFetching() {
			return search.isFetching;
		}
	};
}
