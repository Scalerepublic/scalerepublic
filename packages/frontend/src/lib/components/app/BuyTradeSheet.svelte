<!--
  Purpose: Validate and submit a market buy order.
-->
<script lang="ts">
	import TradeSheetShell from './TradeSheetShell.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { buy } from '$lib/api/queries';
	import { getPortfolio } from '$lib/data/portfolio.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		stock
	}: {
		open?: boolean;
		stock: Stock;
	} = $props();

	const portfolio = getPortfolio();
	const buyMutation = createMutation(() => ({ mutationFn: buy }));

	let quantity = $state(1);
	const available = $derived(portfolio.cashBalance);
	const total = $derived(stock.currentPrice * quantity);
	const insufficientFunds = $derived(total > available);

	async function submit(qty: number) {
		const portfolioId = portfolio.portfolioId;
		if (!portfolioId) throw new Error('Portfolio not loaded');
		if (stock.currentPrice * qty > available) {
			throw new Error('Not enough funds');
		}

		try {
			await buyMutation.mutateAsync({
				portfolioId,
				stockId: stock.id,
				quantity: qty,
				price: stock.currentPrice
			});
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
