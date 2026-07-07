<script lang="ts">
	import { LayoutDashboard, Search, Settings, Trophy, Bell } from '@lucide/svelte';
	import NavItem from './NavItem.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';

	const navItems = [
		{ href: '/dashboard', label: 'Portfolio', icon: LayoutDashboard },
		{ href: '/search', label: 'Market', icon: Search },
		{ href: '/leaderboard', label: 'Ranks', icon: Trophy },
		{ href: '/notifications', label: 'Alerts', icon: Bell },
		{ href: '/settings', label: 'Settings', icon: Settings }
	] as const;
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-30 flex h-14 items-stretch border-t border-border bg-card md:hidden"
>
	{#each navItems as item (item.href)}
		<NavItem
			href={item.href}
			label={item.label}
			icon={item.icon}
			mobile
			badge={item.href === '/notifications' ? notificationStore.unreadCount : 0}
		/>
	{/each}
</nav>
