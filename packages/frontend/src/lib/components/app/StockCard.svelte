<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import NobleButton from './NobleButton.svelte';
	import TradeSheet from './TradeSheet.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';

	let { stock }: { stock: Stock } = $props();

	let tradeOpen = $state(false);

	const badgeLabel = $derived.by(() => {
		const label = (stock.exchange || stock.sector || '').trim();
		if (!label || label.toUpperCase() === 'UNKNOWN') return null;
		return label;
	});
</script>

<article class="group flex flex-col overflow-hidden border border-border bg-card transition-[border-color] hover:border-foreground/40">
	<div class="flex flex-1 flex-col p-4">
		<div class="flex items-start justify-between gap-2 border-b border-border pb-3">
			<div class="min-w-0">
				<p class="font-mono text-lg font-bold text-primary">{stock.ticker}</p>
				<p class="mt-0.5 truncate text-xs text-muted-foreground">{stock.name}</p>
			</div>
			{#if badgeLabel}
				<span
					class="shrink-0 border border-border px-2 py-0.5 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
				>
					{badgeLabel}
				</span>
			{/if}
		</div>

		<div class="mt-auto flex items-end justify-between gap-2 pt-3">
			<div>
				<p class="font-mono text-xl font-bold text-foreground">
					{formatCurrency(stock.currentPrice)}
				</p>
				<div class="mt-0.5">
					<ChangeIndicator amount={stock.dayChange} percent={stock.dayChangePercent} size="sm" />
				</div>
			</div>
			<NobleButton type="button" class="h-8 px-4 text-xs" onclick={() => (tradeOpen = true)}>
				Buy
			</NobleButton>
		</div>
	</div>
</article>

<TradeSheet bind:open={tradeOpen} {stock} mode="buy" />
