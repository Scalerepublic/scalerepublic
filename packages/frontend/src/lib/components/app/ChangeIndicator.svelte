<script lang="ts">
	import { TrendingUp, TrendingDown, Minus } from '@lucide/svelte';
	import { cn, formatCurrency, formatPercent } from '$lib/utils';

	let {
		amount,
		percent,
		showAmount = true,
		size = 'md'
	}: {
		amount: number;
		percent: number;
		showAmount?: boolean;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const tone = $derived(amount === 0 ? 'neutral' : amount > 0 ? 'positive' : 'negative');
	const iconClass = $derived(cn('shrink-0', size === 'sm' ? 'size-3' : 'size-3.5'));
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 font-medium tabular-nums',
		tone === 'positive' && 'text-positive',
		tone === 'negative' && 'text-negative',
		tone === 'neutral' && 'text-muted-foreground',
		size === 'sm' && 'text-xs',
		size === 'md' && 'text-sm',
		size === 'lg' && 'text-base'
	)}
>
	{#if tone === 'positive'}
		<TrendingUp class={iconClass} />
	{:else if tone === 'negative'}
		<TrendingDown class={iconClass} />
	{:else}
		<Minus class={iconClass} />
	{/if}
	{#if showAmount}
		<span>{formatCurrency(amount)}</span>
	{/if}
	<span
		class={cn(
			'border px-1.5 py-0.5 font-semibold',
			size === 'sm' ? 'text-[10px]' : 'text-xs',
			tone === 'positive' && 'border-positive/30 bg-positive/8 text-positive',
			tone === 'negative' && 'border-negative/30 bg-negative/8 text-negative',
			tone === 'neutral' && 'border-border bg-muted text-muted-foreground'
		)}
	>
		{formatPercent(percent)}
	</span>
</span>
