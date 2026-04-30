import type { UserProfile, AppSettings } from '$lib/types';

export const mockUser: UserProfile = {
	id: 'usr_001',
	name: 'David Brandes',
	email: 'dbrandesx@gmail.com',
	startingCapital: 10_000,
	accountStatus: 'active',
	joinedAt: '2026-04-01T00:00:00Z',
	avatarUrl: null,
	rank: 4,
};

export const mockSettings: AppSettings = {
	theme: 'light',
	notifications: {
		priceAlerts: true,
		tradeConfirmations: true,
		weeklyReport: false,
	},
};
