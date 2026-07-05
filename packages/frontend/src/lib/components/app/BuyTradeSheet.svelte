<script lang="ts">
	import TradeSheetShell from './TradeSheetShell.svelte';
	import { formatCurrency } from '$lib/utils';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import type { Stock } from '$lib/types';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		stock
	}: {
		open?: boolean;
		stock: Stock;
	} = $props();

	let quantity = $state(1);
	const available = $derived(portfolioStore.summary.cashBalance);
	const total = $derived(stock.currentPrice * quantity);
	const insufficientFunds = $derived(total > available);

	async function submit(qty: number) {
		if (stock.currentPrice * qty > portfolioStore.summary.cashBalance) {
			throw new Error('Not enough funds');
		}

		try {
			await portfolioStore.buy(stock.id, qty);
			toast.success(`Bought ${qty} × ${stock.ticker}`);
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
	title="Buy {stock.ticker}"
	{stock}
	confirmLabel="Confirm buy"
	submitDisabled={insufficientFunds}
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
			<div class="flex items-center justify-between gap-3">
				<p class="text-sm text-muted-foreground">Estimated Sum:</p>
				<p class="font-mono text-sm font-semibold text-foreground">
					{formatCurrency(total)}
				</p>
			</div>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Available:</p>
				<p class="font-mono text-xs text-muted-foreground">
					{formatCurrency(available)}
				</p>
			</div>
			{#if insufficientFunds}
				<p class="text-xs text-negative">Not enough funds</p>
			{/if}
		</div>
	{/snippet}
</TradeSheetShell>
