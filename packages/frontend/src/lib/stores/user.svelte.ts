import { mockSettings, mockTradingProfile } from '$lib/mock/user';
import { authStore } from '$lib/stores/auth.svelte';
import type { AppSettings, UserProfile } from '$lib/types';

function toIsoString(value: string | Date | undefined | null): string | undefined {
	if (!value) return undefined;
	if (typeof value === 'string') return value;
	return value.toISOString();
}

class UserStore {
	settings = $state<AppSettings>(mockSettings);

	get profile(): UserProfile {
		const user = authStore.user;

		return {
			...mockTradingProfile,
			id: user?.id ?? '',
			name: user?.name ?? '',
			email: user?.email ?? '',
			avatarUrl: user?.image ?? null,
			joinedAt: toIsoString(user?.createdAt) ?? new Date().toISOString()
		};
	}

	updateSettings(partial: Partial<AppSettings>) {
		this.settings = { ...this.settings, ...partial };
	}

	updateNotifications(partial: Partial<AppSettings['notifications']>) {
		this.settings = {
			...this.settings,
			notifications: { ...this.settings.notifications, ...partial }
		};
	}
}

export const userStore = new UserStore();
