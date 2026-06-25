import { authStore } from '$lib/stores/auth.svelte';
import { syncMarketClock } from '$lib/sync-market-clock';
import { marketStore } from '$lib/stores/market.svelte';
import { performanceStore } from '$lib/stores/performance.svelte';
import { portfolioStore } from '$lib/stores/portfolio.svelte';
import { userStore } from '$lib/stores/user.svelte';

let loadedForUserId: string | null = null;
let loadGeneration = 0;

export function resetAppDataBootstrap() {
	loadedForUserId = null;
	loadGeneration += 1;
}

export function bootstrapAppData() {
	const userId = authStore.user?.id;
	if (!authStore.isAuthenticated || !userId) {
		loadedForUserId = null;
		return;
	}

	if (loadedForUserId === userId) {
		return;
	}

	loadedForUserId = userId;
	const generation = ++loadGeneration;

	void Promise.all([
		syncMarketClock(),
		portfolioStore.load(),
		performanceStore.load(userId),
		marketStore.load(),
		userStore.load()
	]).then(() => {
		if (generation !== loadGeneration || authStore.user?.id !== userId) {
			return;
		}
	});
}
