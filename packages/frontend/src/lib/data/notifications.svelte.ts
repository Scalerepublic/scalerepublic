import { createMutation, createQuery } from '@tanstack/svelte-query';
import { toast } from 'svelte-sonner';

import {
	invalidate,
	markAllNotificationsRead,
	markNotificationRead,
	notificationsQuery
} from '$lib/api/queries';

export function getNotifications(options?: { unread?: boolean }) {
	const query = createQuery(() => notificationsQuery());
	const all = $derived(query.data ?? []);
	const items = $derived(options?.unread === true ? all.filter((n) => !n.read) : all);
	const unreadCount = $derived(all.reduce((count, n) => (n.read ? count : count + 1), 0));

	const markReadMutation = createMutation(() => ({
		mutationFn: markNotificationRead,
		onError: () => toast.error('Could not update notification'),
		onSettled: () => invalidate.notifications()
	}));

	const markAllMutation = createMutation(() => ({
		mutationFn: markAllNotificationsRead,
		onSuccess: () => toast.success('All notifications marked as read'),
		onError: () => toast.error('Could not mark notifications as read'),
		onSettled: () => invalidate.notifications()
	}));

	return {
		get items() {
			return items;
		},
		get count() {
			return items.length;
		},
		get unreadCount() {
			return unreadCount;
		},
		get hasUnread() {
			return unreadCount > 0;
		},
		get isLoading() {
			return query.isLoading;
		},
		get isError() {
			return query.isError;
		},
		get error() {
			return query.error;
		},
		get isMarkingAll() {
			return markAllMutation.isPending;
		},
		markRead: (id: string) => markReadMutation.mutate(id),
		markAll: () => {
			if (unreadCount === 0 || markAllMutation.isPending) return;
			markAllMutation.mutate();
		}
	};
}
