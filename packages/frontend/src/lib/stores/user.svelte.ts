import { api, parseApiData } from '$lib/api/client';
import type { BackendUserProfile } from '$lib/api/backend-types';
import { mergeUserProfile } from '$lib/api/mappers';
import { authStore } from '$lib/stores/auth.svelte';
import type { AppSettings, UserProfile } from '$lib/types';

function toIsoString(value: string | Date | undefined | null): string | undefined {
	if (!value) return undefined;
	if (typeof value === 'string') return value;
	return value.toISOString();
}

const defaultSettings: AppSettings = {
	notifications: {
		priceAlerts: true,
		tradeConfirmations: true,
		weeklyReport: false
	}
};

class UserStore {
	settings = $state<AppSettings>(defaultSettings);
	private _backendProfile = $state<BackendUserProfile | null>(null);

	get profile(): UserProfile {
		const user = authStore.user;
		const base: UserProfile = {
			id: user?.id ?? '',
			name: user?.name ?? '',
			email: user?.email ?? '',
			avatarUrl: user?.image ?? null,
			joinedAt: toIsoString(user?.createdAt) ?? new Date().toISOString()
		};

		return mergeUserProfile(base, this._backendProfile);
	}

	async load() {
		const userId = authStore.user?.id;
		if (!userId) {
			this._backendProfile = null;
			return;
		}

		try {
			const res = await api.api.v1.users[':id'].$get({ param: { id: userId } });
			this._backendProfile = await parseApiData(res);
		} catch {
			this._backendProfile = null;
		}
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
