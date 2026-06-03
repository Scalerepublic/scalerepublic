<script lang="ts">
	import NobleButton from './NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import type { Stock } from '$lib/types';

	let {
		open = $bindable(false),
		stock,
		mode = 'buy',
		maxQuantity = 999_999
	}: {
		open?: boolean;
		stock: Stock;
		mode?: 'buy' | 'sell';
		maxQuantity?: number;
	} = $props();

	let quantity = $state(1);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const total = $derived(stock.currentPrice * quantity);
	const title = $derived(mode === 'buy' ? `Buy ${stock.ticker}` : `Sell ${stock.ticker}`);

	$effect(() => {
		if (open) {
			quantity = 1;
			error = null;
			submitting = false;
		}
	});

	function close() {
		open = false;
	}

	async function submit() {
		if (quantity < 1 || quantity > maxQuantity) {
			error = `Enter 1–${maxQuantity} shares`;
			return;
		}

		submitting = true;
		error = null;
		try {
			if (mode === 'buy') {
				await portfolioStore.buy(stock.id, quantity);
			} else {
				await portfolioStore.sell(stock.id, quantity);
			}
			close();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Trade failed';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && close()}
		onkeydown={(e) => e.key === 'Escape' && close()}
	>
		<div
			class="w-full max-w-md border border-border bg-card p-5 shadow-xl"
			role="dialog"
			aria-labelledby="trade-title"
		>
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 id="trade-title" class="font-serif text-lg font-semibold">{title}</h2>
					<p class="mt-0.5 text-sm text-muted-foreground">{stock.name}</p>
				</div>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground"
					onclick={close}
					aria-label="Close"
				>
					×
				</button>
			</div>

			<p class="mb-4 font-mono text-xl font-bold">{formatCurrency(stock.currentPrice)}</p>

			<label
				for="trade-quantity"
				class="mb-1 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
			>
				Shares
			</label>
			<input
				id="trade-quantity"
				type="number"
				min="1"
				max={maxQuantity}
				bind:value={quantity}
				class="mb-1 h-10 w-full border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
			/>
			<p class="mb-4 text-xs text-muted-foreground">
				{mode === 'sell' ? `You own up to ${maxQuantity} shares` : `Estimated total: ${formatCurrency(total)}`}
			</p>

			{#if error}
				<p class="mb-3 text-sm text-negative">{error}</p>
			{/if}

			<div class="flex gap-2">
				<NobleButton type="button" class="flex-1 bg-muted text-foreground" onclick={close}>
					Cancel
				</NobleButton>
				<NobleButton
					type="button"
					class="flex-1"
					disabled={submitting}
					onclick={submit}
				>
					{submitting ? '…' : mode === 'buy' ? 'Confirm buy' : 'Confirm sell'}
				</NobleButton>
			</div>
		</div>
	</div>
{/if}
