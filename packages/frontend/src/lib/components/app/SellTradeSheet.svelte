<script lang="ts">
	import TradeSheetShell from './TradeSheetShell.svelte';
	import { formatCurrency } from '$lib/utils';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import type { Stock } from '$lib/types';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		stock,
		maxQuantity
	}: {
		open?: boolean;
		stock: Stock;
		maxQuantity: number;
	} = $props();

	let quantity = $state(1);
	const exceedsHoldings = $derived(quantity > maxQuantity);
	const total = $derived(stock.currentPrice * quantity);
	const currentBalance = $derived(portfolioStore.summary.cashBalance);
	const resultingBalance = $derived(currentBalance + total);

	function getQuantityError(qty: number) {
		if (qty < 1) return 'Enter at least 1 share';
		if (qty > maxQuantity) return "You can't sell more shares than you own";
		return null;
	}

	async function submit(qty: number) {
		const validationError = getQuantityError(qty);
		if (validationError) throw new Error(validationError);

		try {
			await portfolioStore.sell(stock.id, qty);
			toast.success(`Sold ${qty} × ${stock.ticker}`);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Trade failed';
			toast.error(message);
			throw e;
		}
	}
</script>

<TradeSheetShell
	bind:open
	bind:quantity
	title="Sell {stock.ticker}"
	{stock}
	{maxQuantity}
	confirmLabel="Confirm sell"
	submitDisabled={exceedsHoldings || quantity < 1}
	{getQuantityError}
	onsubmit={submit}
>
	{#snippet marketPrice()}
		<div class="flex items-center justify-between gap-3">
			<p class="text-sm text-muted-foreground">Market Price:</p>
			<p class="font-mono text-sm font-semibold text-foreground">
				{formatCurrency(stock.currentPrice)}
			</p>
		</div>
	{/snippet}

	{#snippet summary()}
		<div class="space-y-2">
			<p class="text-xs text-muted-foreground">
				You can sell {maxQuantity}
				{maxQuantity === 1 ? 'share' : 'shares'}
			</p>
			<div class="flex items-center justify-between gap-3">
				<p class="text-sm text-muted-foreground">Estimated Sum:</p>
				<p class="font-mono text-sm font-semibold text-foreground">
					{formatCurrency(total)}
				</p>
			</div>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Current balance:</p>
				<p class="font-mono text-xs text-muted-foreground">
					{formatCurrency(currentBalance)}
				</p>
			</div>
			<div class="border-t border-border"></div>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Resulting balance:</p>
				<p class="font-mono text-xs text-muted-foreground">
					{formatCurrency(resultingBalance)}
				</p>
			</div>
			{#if exceedsHoldings}
				<p class="text-xs text-negative">You can't sell more shares than you own</p>
			{/if}
		</div>
	{/snippet}
</TradeSheetShell>
