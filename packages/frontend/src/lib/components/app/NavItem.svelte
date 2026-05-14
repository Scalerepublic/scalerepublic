<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';

	let {
		href,
		label,
		icon: Icon,
		mobile = false
	}: {
		href: string;
		label: string;
		icon: Component<{ class?: string; style?: string }>;
		mobile?: boolean;
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
			class={cn('size-5 transition-colors', isActive ? 'text-accent' : 'text-muted-foreground')}
		/>
		{label}
	</a>
{:else}
	<a
		href={resolve(href)}
		class={cn(
			'group flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-all duration-150',
			isActive
				? 'text-[oklch(0.30_0.02_68)]'
				: 'text-[oklch(0.43_0.018_68)] hover:text-[oklch(0.30_0.02_68)]'
		)}
		style={isActive
			? 'border-color: oklch(0.64 0.045 78); background: linear-gradient(135deg, oklch(0.93 0.03 84) 0%, oklch(0.89 0.03 81) 52%, oklch(0.85 0.03 78) 100%); box-shadow: 1px 2px 0 oklch(0.55 0.03 76 / 0.12), 2px 4px 8px oklch(0.55 0.03 76 / 0.10);'
			: 'border-color: oklch(0.78 0.025 78 / 0.85); background: linear-gradient(135deg, oklch(0.95 0.02 84) 0%, oklch(0.92 0.02 80) 100%);'}
	>
		<Icon
			class={cn(
				'size-4 shrink-0 transition-colors',
				isActive ? 'text-[oklch(0.50_0.08_82)]' : 'text-[oklch(0.50_0.03_70)]'
			)}
		/>
		<span>{label}</span>
	</a>
{/if}
