<script lang="ts">
	import { cn, formatCurrency, formatPercent, formatNumber } from '$lib/utils';
	import type { HoldingWithMarket } from '$lib/types';

	let { holdings }: { holdings: HoldingWithMarket[] } = $props();
</script>

<div class="overflow-x-auto rounded-xl border border-border">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-border bg-muted/50">
				<th class="px-4 py-3 text-left font-serif font-semibold text-foreground">Ticker</th>
				<th
					class="hidden px-4 py-3 text-left font-serif font-semibold text-foreground sm:table-cell"
					>Name</th
				>
				<th class="px-4 py-3 text-right font-serif font-semibold text-foreground">Shares</th>
				<th
					class="hidden px-4 py-3 text-right font-serif font-semibold text-foreground md:table-cell"
					>Avg Cost</th
				>
				<th class="px-4 py-3 text-right font-serif font-semibold text-foreground">Price</th>
				<th class="px-4 py-3 text-right font-serif font-semibold text-foreground">Value</th>
				<th class="px-4 py-3 text-right font-serif font-semibold text-foreground">P&amp;L</th>
				<th
					class="hidden px-4 py-3 text-right font-serif font-semibold text-foreground sm:table-cell"
					>P&amp;L %</th
				>
			</tr>
		</thead>
		<tbody>
			{#each holdings as h (h.ticker)}
				<tr class="border-t border-border/60 transition-colors hover:bg-muted/30">
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
								'rounded px-1.5 py-0.5 text-xs font-semibold',
								h.pnl >= 0 ? 'bg-positive/10' : 'bg-negative/10'
							)}
						>
							{formatPercent(h.pnlPercent)}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
