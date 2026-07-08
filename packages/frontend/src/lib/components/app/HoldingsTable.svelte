<script lang="ts">
	import NobleButton from './NobleButton.svelte';
	import StockDetailSheet from './StockDetailSheet.svelte';
	import SellTradeSheet from './SellTradeSheet.svelte';
	import { cn, formatCurrency, formatPercent, formatNumber } from '$lib/utils';
	import type { HoldingWithMarket, Stock } from '$lib/types';

	let { holdings, readOnly = false }: { holdings: HoldingWithMarket[]; readOnly?: boolean } =
		$props();

	let sellTarget = $state<HoldingWithMarket | null>(null);
	let sellOpen = $state(false);
	let detailStock = $state<Stock | null>(null);
	let detailOpen = $state(false);

	function openSell(h: HoldingWithMarket, event: MouseEvent) {
		event.stopPropagation();
		sellTarget = h;
		sellOpen = true;
	}

	function openDetail(h: HoldingWithMarket) {
		detailStock = h.stock;
		detailOpen = true;
	}
</script>

<div class="overflow-x-auto border border-border">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-border bg-muted">
				<th class="table-th text-left">Ticker</th>
				<th class="table-th hidden text-left sm:table-cell">Name</th>
				<th class="table-th text-right">Shares</th>
				<th class="table-th hidden text-right md:table-cell">Avg Cost</th>
				<th class="table-th text-right">Price</th>
				<th class="table-th text-right">Value</th>
				<th class="table-th text-right">P&amp;L</th>
				<th class="table-th hidden text-right sm:table-cell">P&amp;L %</th>
				<th class="table-th text-right"
					>{#if !readOnly}&nbsp;{/if}</th
				>
			</tr>
		</thead>
		<tbody>
			{#each holdings as h, i (h.ticker)}
				<tr
					class={cn(
						'cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/40',
						i % 2 !== 0 && 'bg-background'
					)}
					onclick={() => openDetail(h)}
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
							<NobleButton
								type="button"
								class="h-7 px-3 text-[10px]"
								onclick={(event) => openSell(h, event)}
							>
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
	<SellTradeSheet bind:open={sellOpen} stock={sellTarget.stock} maxQuantity={sellTarget.shares} />
{/if}

{#if detailStock}
	<StockDetailSheet bind:open={detailOpen} stock={detailStock} />
{/if}
