<!--
  Purpose: Create a price-triggered automatic trade rule.
-->
<script lang="ts">
	import NobleButton from './NobleButton.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { createLimitOrder } from '$lib/api/queries';
	import { getPortfolio } from '$lib/data/portfolio.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';
	import { portal } from '$lib/actions/portal';
	import { untrack } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';

	function panelTransition(node: HTMLElement) {
		return window.innerWidth < 640
			? fly(node, { y: 500, duration: 300, easing: cubicOut })
			: scale(node, { start: 0.95, duration: 200, easing: cubicOut });
	}

	let {
		open = $bindable(false),
		stock
	}: {
		open?: boolean;
		stock: Stock;
	} = $props();

	type Action = 'BUY' | 'SELL';
	type Direction = 'AT_OR_ABOVE' | 'AT_OR_BELOW';

	const portfolio = getPortfolio();
	const createMutationRef = createMutation(() => ({ mutationFn: createLimitOrder }));

	let action = $state<Action>('BUY');
	let direction = $state<Direction>('AT_OR_BELOW');
	let threshold = $state(0);
	let quantity = $state(1);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			action = 'BUY';
			direction = 'AT_OR_BELOW';
			threshold = Number(stock.currentPrice.toFixed(2));
			quantity = 1;
			error = null;
		});
	});

	const orderType = $derived.by(() => {
		if (action === 'BUY') return direction === 'AT_OR_BELOW' ? 'Limit buy' : 'Stop buy';
		return direction === 'AT_OR_ABOVE' ? 'Take-profit' : 'Stop-loss';
	});
	const directionLabel = $derived(direction === 'AT_OR_ABOVE' ? 'at or above' : 'at or below');
	const valid = $derived(threshold > 0 && Number.isInteger(quantity) && quantity >= 1);

	async function submit() {
		if (!valid) {
			error = 'Enter a positive price and a whole number of shares.';
			return;
		}
		const portfolioId = portfolio.portfolioId;
		if (!portfolioId) {
			error = 'Portfolio not loaded.';
			return;
		}
		error = null;
		try {
			await createMutationRef.mutateAsync({
				portfolioId,
				stockId: stock.id,
				ruleType: action,
				triggerDirection: direction,
				priceThreshold: threshold,
				quantity
			});
			toast.success(`${orderType} placed for ${quantity} × ${stock.ticker}`);
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not place the order.';
		}
	}

	const segBase =
		'h-10 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:border-accent';
	const segActive = 'border-accent bg-accent/10 text-foreground';
	const segIdle = 'border-input bg-background text-muted-foreground hover:bg-muted';
</script>

{#if open}
	<div
		use:portal
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 pb-0 sm:items-center sm:p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && (open = false)}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
	>
		<div transition:panelTransition class="relative w-full max-w-md">
			<div
				class="rounded-t-2xl border border-b-0 border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:border-b"
				role="dialog"
				tabindex="-1"
				aria-labelledby="limit-order-title"
			>
				<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden"></div>

				<div class="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 id="limit-order-title" class="font-serif text-lg font-semibold">
							Limit order · {stock.ticker}
						</h2>
						<p class="mt-0.5 text-sm text-muted-foreground">{stock.name}</p>
					</div>
					<button
						type="button"
						class="hidden text-muted-foreground hover:text-foreground sm:block"
						onclick={() => (open = false)}
						aria-label="Close"
					>
						×
					</button>
				</div>

				<div class="mb-4 space-y-4">
					<div class="flex items-center justify-between gap-3">
						<p class="text-sm text-muted-foreground">Market price</p>
						<p class="font-mono text-sm font-semibold text-foreground">
							{formatCurrency(stock.currentPrice)}
						</p>
					</div>

					<div>
						<p
							class="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>
							Action
						</p>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								class="{segBase} {action === 'BUY' ? segActive : segIdle}"
								onclick={() => (action = 'BUY')}
							>
								Buy
							</button>
							<button
								type="button"
								class="{segBase} {action === 'SELL' ? segActive : segIdle}"
								onclick={() => (action = 'SELL')}
							>
								Sell
							</button>
						</div>
					</div>

					<div>
						<p
							class="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>
							Trigger when price is
						</p>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								class="{segBase} {direction === 'AT_OR_BELOW' ? segActive : segIdle}"
								onclick={() => (direction = 'AT_OR_BELOW')}
							>
								At or below
							</button>
							<button
								type="button"
								class="{segBase} {direction === 'AT_OR_ABOVE' ? segActive : segIdle}"
								onclick={() => (direction = 'AT_OR_ABOVE')}
							>
								At or above
							</button>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label
								for="limit-threshold"
								class="mb-1 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
							>
								Price
							</label>
							<input
								id="limit-threshold"
								type="number"
								min="0"
								step="0.01"
								bind:value={threshold}
								class="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
							/>
						</div>
						<div>
							<label
								for="limit-quantity"
								class="mb-1 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
							>
								Shares
							</label>
							<input
								id="limit-quantity"
								type="number"
								min="1"
								bind:value={quantity}
								class="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
							/>
						</div>
					</div>

					<div class="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
						<p class="text-[10px] font-semibold tracking-widest text-accent uppercase">
							{orderType}
						</p>
						<p class="mt-1 text-sm text-foreground/90">
							{action === 'BUY' ? 'Buy' : 'Sell'}
							<span class="font-semibold">{quantity || 0}</span>
							{stock.ticker} when the price is {directionLabel}
							<span class="font-mono font-semibold">{formatCurrency(threshold || 0)}</span>.
						</p>
					</div>
				</div>

				{#if error}
					<p class="mb-3 text-sm text-negative">{error}</p>
				{/if}

				<div class="flex gap-2">
					<NobleButton
						variant="secondary"
						type="button"
						class="flex-1"
						onclick={() => (open = false)}
					>
						Cancel
					</NobleButton>
					<NobleButton
						type="button"
						class="flex-1"
						disabled={createMutationRef.isPending || !valid}
						onclick={submit}
					>
						{createMutationRef.isPending ? '…' : 'Place order'}
					</NobleButton>
				</div>
			</div>
			<div class="absolute inset-x-0 h-24 bg-card sm:hidden" style="top: 100%"></div>
		</div>
	</div>
{/if}
