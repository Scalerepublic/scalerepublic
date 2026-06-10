<script lang="ts">
	import { TrendingUp, TrendingDown } from '@lucide/svelte';
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

	const isPositive = $derived(amount >= 0);
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 font-medium tabular-nums',
		isPositive ? 'text-positive' : 'text-negative',
		size === 'sm' && 'text-xs',
		size === 'md' && 'text-sm',
		size === 'lg' && 'text-base'
	)}
>
	{#if isPositive}
		<TrendingUp class={cn('shrink-0', size === 'sm' ? 'size-3' : 'size-3.5')} />
	{:else}
		<TrendingDown class={cn('shrink-0', size === 'sm' ? 'size-3' : 'size-3.5')} />
	{/if}
	{#if showAmount}
		<span>{formatCurrency(amount)}</span>
	{/if}
	<span
		class={cn(
			'border px-1.5 py-0.5 font-semibold',
			size === 'sm' ? 'text-[10px]' : 'text-xs',
			isPositive
				? 'border-positive/30 bg-positive/8 text-positive'
				: 'border-negative/30 bg-negative/8 text-negative'
		)}
	>
		{formatPercent(percent)}
	</span>
</span>
