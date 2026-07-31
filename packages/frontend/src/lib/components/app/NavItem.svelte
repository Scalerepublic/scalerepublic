<script lang="ts">
	import { page } from '$app/state';
	import type { RouteId } from '$app/types';
	import { appResolve } from '$lib/app-resolve';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';

	let {
		href,
		label,
		icon: Icon,
		mobile = false,
		collapsed = false,
		badge = 0
	}: {
		href: RouteId;
		label: string;
		icon: Component<{ class?: string; style?: string }>;
		mobile?: boolean;
		collapsed?: boolean;
		badge?: number;
	} = $props();

	const isActive = $derived(page.url.pathname.startsWith(href));
	const showBadge = $derived(badge > 0);
	const badgeLabel = $derived(badge > 9 ? '9+' : String(badge));
</script>

{#if mobile}
	<a
		href={appResolve(href)}
		class={cn(
			'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold tracking-widest uppercase transition-colors',
			isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
		)}
	>
		<span class="relative">
			<Icon
				class={cn(
					'size-5 transition-colors',
					isActive ? 'text-foreground' : 'text-muted-foreground'
				)}
			/>
			{#if showBadge}
				<span
					class="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
				>
					{badgeLabel}
				</span>
			{/if}
		</span>
		{label}
	</a>
{:else}
	<a
		href={appResolve(href)}
		title={collapsed ? label : undefined}
		class={cn(
			'group flex items-center rounded-lg py-2 text-sm transition-colors duration-100',
			collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
			isActive
				? 'border border-border bg-secondary font-semibold text-primary'
				: 'border border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
		)}
	>
		<span class="relative shrink-0">
			<Icon
				class={cn(
					'size-4 transition-colors',
					isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
				)}
			/>
			{#if showBadge && collapsed}
				<span
					class="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground"
				>
					{badgeLabel}
				</span>
			{/if}
		</span>
		{#if !collapsed}
			<span>{label}</span>
			{#if showBadge}
				<span
					class="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
				>
					{badgeLabel}
				</span>
			{/if}
		{/if}
	</a>
{/if}
