<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';

	let {
		href,
		label,
		icon: Icon,
		mobile = false,
		collapsed = false
	}: {
		href: Parameters<typeof resolve>[0];
		label: string;
		icon: Component<{ class?: string; style?: string }>;
		mobile?: boolean;
		collapsed?: boolean;
	} = $props();

	const isActive = $derived(page.url.pathname.startsWith(href));
</script>

{#if mobile}
	<a
		href={resolve(href)}
		class={cn(
			'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold tracking-widest uppercase transition-colors',
			isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
		)}
	>
		<Icon
			class={cn('size-5 transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground')}
		/>
		{label}
	</a>
{:else}
	<a
		href={resolve(href)}
		title={collapsed ? label : undefined}
		class={cn(
			'group flex items-center py-2 text-sm transition-colors duration-100',
			collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
			isActive
				? 'border-l-[3px] border-primary bg-muted font-semibold text-primary'
				: 'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
		)}
	>
		<Icon
			class={cn(
				'size-4 shrink-0 transition-colors',
				isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
			)}
		/>
		{#if !collapsed}
			<span>{label}</span>
		{/if}
	</a>
{/if}
