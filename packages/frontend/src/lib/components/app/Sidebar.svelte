<script lang="ts">
	import {
		LayoutDashboard,
		Search,
		Settings,
		Trophy,
		PanelLeftClose,
		PanelLeft,
		LogOut
	} from '@lucide/svelte';
	import NavItem from './NavItem.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getInitials, cn } from '$lib/utils';

	const navItems = [
		{ href: '/dashboard', label: 'Portfolio', icon: LayoutDashboard },
		{ href: '/search', label: 'Market', icon: Search },
		{ href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
		{ href: '/settings', label: 'Settings', icon: Settings }
	] as const;

	let isSigningOut = $state(false);

	async function handleSignOut() {
		if (isSigningOut) return;
		isSigningOut = true;
		await signOut();
		await goto(resolve('/login'), { replaceState: true, invalidateAll: true });
	}
</script>

<aside
	class={cn(
		'fixed top-0 left-0 z-30 hidden h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex',
		sidebarStore.collapsed ? 'w-16' : 'w-64'
	)}
>
	<div
		class={cn(
			'border-b border-sidebar-border',
			sidebarStore.collapsed ? 'px-2 py-4' : 'sidebar-section'
		)}
	>
		<div
			class={cn(
				'flex items-center',
				sidebarStore.collapsed ? 'justify-center' : 'justify-between gap-3'
			)}
		>
			{#if !sidebarStore.collapsed}
				<p class="sidebar-brand">ScaleRepublic</p>
			{/if}
			<button
				type="button"
				onclick={() => sidebarStore.toggle()}
				class="flex size-8 shrink-0 items-center justify-center border border-border text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
				aria-label={sidebarStore.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				{#if sidebarStore.collapsed}
					<PanelLeft class="size-4" />
				{:else}
					<PanelLeftClose class="size-4" />
				{/if}
			</button>
		</div>
	</div>

	<nav class={cn('sidebar-nav', sidebarStore.collapsed && 'px-2')}>
		{#each navItems as item (item.href)}
			<NavItem
				href={item.href}
				label={item.label}
				icon={item.icon}
				collapsed={sidebarStore.collapsed}
			/>
		{/each}
	</nav>

	<div class="border-t border-sidebar-border">
		<div class={cn(sidebarStore.collapsed ? 'px-2 py-3' : 'p-3')}>
			<div
				class={cn(
					'flex items-center',
					sidebarStore.collapsed ? 'flex-col justify-center gap-2' : 'gap-2.5'
				)}
			>
				<div
					class="flex size-7 shrink-0 items-center justify-center border border-border bg-muted text-[11px] font-bold text-foreground"
					title={sidebarStore.collapsed ? userStore.profile.name : undefined}
				>
					{getInitials(userStore.profile.name)}
				</div>
				{#if !sidebarStore.collapsed}
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-semibold text-sidebar-foreground">
							{userStore.profile.name}
						</p>
						<p class="truncate text-[10px] text-muted-foreground">
							{userStore.profile.email}
						</p>
					</div>
					<button
						type="button"
						onclick={handleSignOut}
						disabled={isSigningOut}
						aria-label="Sign out"
						title="Sign out"
						class="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					>
						<LogOut class="size-3.5" />
					</button>
				{:else}
					<button
						type="button"
						onclick={handleSignOut}
						disabled={isSigningOut}
						aria-label="Sign out"
						title="Sign out"
						class="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					>
						<LogOut class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>
	</div>
</aside>
