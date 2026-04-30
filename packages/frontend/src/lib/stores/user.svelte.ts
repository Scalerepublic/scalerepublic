import { mockUser, mockSettings } from '$lib/mock/user';
import type { UserProfile, AppSettings } from '$lib/types';

class UserStore {
	profile = $state<UserProfile>(mockUser);
	settings = $state<AppSettings>(mockSettings);

	updateSettings(partial: Partial<AppSettings>) {
		this.settings = { ...this.settings, ...partial };
	}

	updateNotifications(partial: Partial<AppSettings['notifications']>) {
		this.settings = {
			...this.settings,
			notifications: { ...this.settings.notifications, ...partial },
		};
	}
}

export const userStore = new UserStore();
