<script lang="ts">
	import { cn, formatCurrency } from '$lib/utils';

	let {
		holdingsValue,
		cashBalance,
		totalValue
	}: {
		holdingsValue: number;
		cashBalance: number;
		totalValue: number;
	} = $props();

	const cells = $derived([
		{ label: 'Portfolio Value', value: holdingsValue },
		{ label: 'Cash Available', value: cashBalance },
		{ label: 'Total', value: totalValue }
	]);
</script>

<div class="mt-6 grid gap-0 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
	{#each cells as cell, i (cell.label)}
		<div
			class={cn(
				'px-5 py-4',
				i < 2 && 'border-b border-border sm:border-r sm:border-b-0',
				i > 0 && 'sm:text-right'
			)}
		>
			<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
				{cell.label}
			</p>
			<p class="mt-1.5 text-xl font-semibold tracking-tight text-primary tabular-nums">
				{formatCurrency(cell.value)}
			</p>
		</div>
	{/each}
</div>
