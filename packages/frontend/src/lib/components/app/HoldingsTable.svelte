<script lang="ts">
	import NobleButton from './NobleButton.svelte';
	import TradeSheet from './TradeSheet.svelte';
	import { cn, formatCurrency, formatPercent, formatNumber } from '$lib/utils';
	import type { HoldingWithMarket } from '$lib/types';

	let { holdings, readOnly = false }: { holdings: HoldingWithMarket[]; readOnly?: boolean } = $props();

	let sellTarget = $state<HoldingWithMarket | null>(null);
	let sellOpen = $state(false);

	function openSell(h: HoldingWithMarket) {
		sellTarget = h;
		sellOpen = true;
	}
</script>

<div class="overflow-x-auto border border-border">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-border bg-muted">
				<th
					class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>Ticker</th
				>
				<th
					class="hidden px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase sm:table-cell"
					>Name</th
				>
				<th
					class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>Shares</th
				>
				<th
					class="hidden px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase md:table-cell"
					>Avg Cost</th
				>
				<th
					class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>Price</th
				>
				<th
					class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>Value</th
				>
				<th
					class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>P&amp;L</th
				>
				<th
					class="hidden px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase sm:table-cell"
					>P&amp;L %</th
				>
				<th
					class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
				>{#if !readOnly}&nbsp;{/if}</th>
			</tr>
		</thead>
		<tbody>
			{#each holdings as h, i (h.ticker)}
				<tr
					class={cn(
						'border-t border-border/60 transition-colors hover:bg-muted/40',
						i % 2 !== 0 && 'bg-background'
					)}
				>
					<td class="px-4 py-3.5">
						<div>
							<span class="font-mono text-sm font-bold text-primary">{h.ticker}</span>
							<p class="mt-0.5 text-[10px] text-muted-foreground sm:hidden">{h.stock.name}</p>
						</div>
					</td>
					<td class="hidden max-w-[160px] truncate px-4 py-3.5 text-foreground sm:table-cell"
						>{h.stock.name}</td
					>
					<td class="px-4 py-3.5 text-right font-mono">{formatNumber(h.shares)}</td>
					<td class="hidden px-4 py-3.5 text-right font-mono text-muted-foreground md:table-cell"
						>{formatCurrency(h.avgCost)}</td
					>
					<td class="px-4 py-3.5 text-right font-mono">{formatCurrency(h.stock.currentPrice)}</td>
					<td class="px-4 py-3.5 text-right font-mono font-medium"
						>{formatCurrency(h.currentValue)}</td
					>
					<td
						class={cn(
							'px-4 py-3.5 text-right font-mono font-semibold',
							h.pnl >= 0 ? 'text-positive' : 'text-negative'
						)}
					>
						{h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl)}
					</td>
					<td
						class={cn(
							'hidden px-4 py-3.5 text-right font-mono sm:table-cell',
							h.pnl >= 0 ? 'text-positive' : 'text-negative'
						)}
					>
						<span
							class={cn(
								'border px-1.5 py-0.5 text-xs font-semibold',
								h.pnl >= 0 ? 'border-positive/30 bg-positive/8' : 'border-negative/30 bg-negative/8'
							)}
						>
							{formatPercent(h.pnlPercent)}
						</span>
					</td>
					<td class="px-4 py-3.5 text-right">
						{#if !readOnly}
							<NobleButton type="button" class="h-7 px-3 text-[10px]" onclick={() => openSell(h)}>
								Sell
							</NobleButton>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if sellTarget && !readOnly}
	<TradeSheet
		bind:open={sellOpen}
		stock={sellTarget.stock}
		mode="sell"
		maxQuantity={sellTarget.shares}
	/>
{/if}
