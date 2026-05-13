<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import NobleButton from './NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';

	let { stock }: { stock: Stock } = $props();
</script>

<article
	class="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all"
>
	<div class="flex flex-1 flex-col p-4">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="font-serif text-xl leading-tight font-bold text-primary">{stock.ticker}</p>
				<p class="mt-0.5 truncate text-xs text-muted-foreground">{stock.name}</p>
			</div>
			<span
				class="shrink-0 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
			>
				{stock.sector}
			</span>
		</div>

		<div class="mt-auto flex items-end justify-between gap-2 pt-4">
			<div>
				<p class="font-mono text-lg font-bold text-foreground">
					{formatCurrency(stock.currentPrice)}
				</p>
				<div class="mt-0.5">
					<ChangeIndicator amount={stock.dayChange} percent={stock.dayChangePercent} size="sm" />
				</div>
			</div>
			<NobleButton class="h-8 px-4 text-sm">Buy</NobleButton>
		</div>
	</div>
</article>
