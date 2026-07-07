import { api, parseApiData } from '$lib/api/client';
import type { BackendNotification } from '$lib/api/backend-types';

export type Notification = BackendNotification;

class NotificationStore {
	items = $state<Notification[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	private loadInFlight: Promise<void> | null = null;

	get unreadCount(): number {
		return this.items.reduce((count, item) => (item.read ? count : count + 1), 0);
	}

	async load(options?: { silent?: boolean }) {
		if (this.loadInFlight) {
			return this.loadInFlight;
		}

		const silent = options?.silent ?? false;
		this.loadInFlight = this.fetchItems(silent).finally(() => {
			this.loadInFlight = null;
		});
		return this.loadInFlight;
	}

	private async fetchItems(silent: boolean) {
		if (!silent) {
			this.loading = true;
			this.error = null;
		}
		try {
			const res = await api.api.v1.notifications.$get({ query: { limit: '50' } });
			this.items = await parseApiData<Notification[]>(res);
			if (!silent) {
				this.error = null;
			}
		} catch (e) {
			if (!silent) {
				this.error = e instanceof Error ? e.message : 'Failed to load notifications';
			}
		} finally {
			if (!silent) {
				this.loading = false;
			}
		}
	}

	async markAsRead(id: string) {
		const target = this.items.find((item) => item.id === id);
		if (target === undefined || target.read) {
			return;
		}

		this.items = this.items.map((item) => (item.id === id ? { ...item, read: true } : item));
		try {
			const res = await api.api.v1.notifications[':id'].read.$post({ param: { id } });
			await parseApiData(res);
		} catch {
			this.items = this.items.map((item) => (item.id === id ? { ...item, read: false } : item));
		}
	}

	async markAllAsRead() {
		if (this.unreadCount === 0) {
			return;
		}

		const previous = this.items;
		this.items = this.items.map((item) => (item.read ? item : { ...item, read: true }));
		try {
			const res = await api.api.v1.notifications['read-all'].$post();
			await parseApiData(res);
		} catch {
			this.items = previous;
		}
	}

	reset() {
		this.items = [];
		this.error = null;
	}
}

export const notificationStore = new NotificationStore();
