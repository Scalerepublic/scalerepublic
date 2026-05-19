import type { AppSettings } from '$lib/types';

// Trading-app defaults every authenticated user until the
// backend exposes per-user account data.
// Identity fields come from BetterAuth via $lib/stores/auth.svelte.
export const mockTradingProfile = {
	startingCapital: 10_000,
	accountStatus: 'active' as const,
	rank: 4
};

export const mockSettings: AppSettings = {
	theme: 'light',
	notifications: {
		priceAlerts: true,
		tradeConfirmations: true,
		weeklyReport: false
	}
};
