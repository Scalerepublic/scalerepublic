import { syncMarketClock } from '$lib/sync-market-clock';
import { marketStore } from '$lib/stores/market.svelte';
import { portfolioStore } from '$lib/stores/portfolio.svelte';
import { leaderboardStore } from '$lib/stores/leaderboard.svelte';

const readPollMs = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value ?? fallback);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const POLL_MS = readPollMs(import.meta.env.VITE_LIVE_QUOTES_POLL_MS, 15_000);
const LEADERBOARD_POLL_MS = readPollMs(import.meta.env.VITE_LEADERBOARD_POLL_MS, 30_000);

function refreshQuotes() {
	if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
		return;
	}
	void Promise.all([
		syncMarketClock(),
		marketStore.loadTrending({ silent: true }),
		portfolioStore.load({ silent: true })
	]);
}

function refreshLeaderboard() {
	if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
		return;
	}
	void leaderboardStore.load({ silent: true });
}

function createPoller(refresh: () => void, intervalMs: number): () => void {
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
		timer = setInterval(refresh, intervalMs);
	};

	const onVisibilityChange = () => {
		if (document.visibilityState === 'visible') {
			refresh();
			startTimer();
		} else {
			clearTimer();
		}
	};

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

export function startLiveQuotesPolling(): () => void {
	return createPoller(refreshQuotes, POLL_MS);
}

export function startLeaderboardPolling(): () => void {
	return createPoller(refreshLeaderboard, LEADERBOARD_POLL_MS);
}
