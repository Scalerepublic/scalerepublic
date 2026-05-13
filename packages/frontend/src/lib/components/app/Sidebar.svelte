<script lang="ts">
	import { LayoutDashboard, Search, Settings, Landmark } from '@lucide/svelte';
	import NavItem from './NavItem.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { getInitials } from '$lib/utils';

	const navItems = [
		{ href: '/dashboard', label: 'Portfolio', icon: LayoutDashboard },
		{ href: '/search', label: 'Market', icon: Search },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];
</script>

<aside
	class="fixed top-0 left-0 z-30 hidden h-full w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex"
>
	<div class="px-6 py-6">
		<div class="flex items-center gap-3">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/35 bg-accent/10 text-accent"
			>
				<Landmark class="size-4" />
			</div>
			<div class="min-w-0">
				<p class="font-serif text-sm leading-tight font-bold tracking-wide text-sidebar-foreground">
					ScaleRepublic
				</p>
				<div class="mt-1.5 flex items-center gap-1.5">
					<div class="h-px flex-1 bg-accent/35"></div>
					<span class="text-[8.5px] font-semibold tracking-[0.22em] text-accent/75 uppercase"
						>Exchange</span
					>
					<div class="h-px flex-1 bg-accent/35"></div>
				</div>
			</div>
		</div>
	</div>

	<nav class="flex-1 space-y-1 px-3 py-5">
		{#each navItems as item (item.href)}
			<NavItem href={item.href} label={item.label} icon={item.icon} />
		{/each}
	</nav>

	<div class="border-t border-sidebar-border">
		<div class="px-4 py-4">
			<div
				class="flex items-center gap-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/35 px-3 py-2.5"
			>
				<div
					class="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-xs font-bold text-accent"
				>
					{getInitials(userStore.profile.name)}
				</div>
				<div class="min-w-0">
					<p class="truncate text-xs font-semibold text-sidebar-foreground">
						{userStore.profile.name}
					</p>
					<p class="truncate text-[10px] text-sidebar-foreground/55">
						{userStore.profile.email}
					</p>
				</div>
			</div>
		</div>
	</div>
</aside>
