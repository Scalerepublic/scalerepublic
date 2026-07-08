<script lang="ts">
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
	{#if showAmount}
		<span>{isPositive ? '+' : ''}{formatCurrency(amount)}</span>
	{/if}
	<span class="font-semibold">{formatPercent(percent)}</span>
</span>
