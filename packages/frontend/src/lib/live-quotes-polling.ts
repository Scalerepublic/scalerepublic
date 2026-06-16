import { syncMarketClock } from '$lib/sync-market-clock';
import { marketStore } from '$lib/stores/market.svelte';
import { performanceStore } from '$lib/stores/performance.svelte';
import { portfolioStore } from '$lib/stores/portfolio.svelte';
import { authStore } from '$lib/stores/auth.svelte';

const POLL_MS = Number(import.meta.env.VITE_LIVE_QUOTES_POLL_MS ?? 5_000);

function refreshQuotes() {
	if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
		return;
	}
	const userId = authStore.user?.id;
	void syncMarketClock();
	void marketStore.load({ silent: true });
	void portfolioStore.load();
	if (userId) {
		void performanceStore.load(userId);
	}
}

export function startLiveQuotesPolling(): () => void {
	let stopped = false;
	let timer: ReturnType<typeof setInterval> | null = null;

	const clearTimer = () => {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};

	const startTimer = () => {
		clearTimer();
		if (stopped || typeof document === 'undefined') return;
		if (document.visibilityState === 'hidden') return;
		timer = setInterval(refreshQuotes, POLL_MS);
	};

	const onVisibilityChange = () => {
		if (document.visibilityState === 'visible') {
			refreshQuotes();
			startTimer();
		} else {
			clearTimer();
		}
	};

	refreshQuotes();
	startTimer();

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', onVisibilityChange);
	}

	return () => {
		stopped = true;
		clearTimer();
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
	};
}
