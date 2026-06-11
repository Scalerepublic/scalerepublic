<script lang="ts">
	import NobleButton from './NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import type { Stock } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	function panelTransition(node: HTMLElement) {
		return window.innerWidth < 640
			? fly(node, { y: 500, duration: 300, easing: cubicOut })
			: scale(node, { start: 0.95, duration: 200, easing: cubicOut });
	}

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

	let dragStartY = $state(0);
	let dragY = $state(0);
	let isDragging = $state(false);
	const dragOffset = $derived.by(() => {
		if (!isDragging) return 0;
		const raw = dragY - dragStartY;
		return raw >= 0 ? raw : Math.max(raw * 0.3, -20);
	});
	const DISMISS_THRESHOLD = 100;

	function onDragStart(e: TouchEvent) {
		dragStartY = e.touches[0].clientY;
		dragY = dragStartY;
		isDragging = true;
	}

	function onDragMove(e: TouchEvent) {
		if (!isDragging) return;
		dragY = e.touches[0].clientY;
	}

	function onDragEnd() {
		const offset = Math.max(0, dragY - dragStartY);
		isDragging = false;
		dragStartY = 0;
		dragY = 0;
		if (offset >= DISMISS_THRESHOLD) close();
	}

	const total = $derived(stock.currentPrice * quantity);
	const title = $derived(mode === 'buy' ? `Buy ${stock.ticker}` : `Sell ${stock.ticker}`);

	$effect(() => {
		if (open) {
			quantity = 1;
			error = null;
			submitting = false;
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
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
			const action = mode === 'buy' ? 'Bought' : 'Sold';
			toast.success(`${action} ${quantity} × ${stock.ticker}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Trade failed';
			toast.error(error);
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 pb-0 sm:items-center sm:p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && close()}
		onkeydown={(e) => e.key === 'Escape' && close()}
	>
		<div transition:panelTransition class="relative w-full max-w-md">
			<div
				class="rounded-t-2xl border border-b-0 border-border bg-card p-5 shadow-xl sm:rounded-none sm:border-b"
				style="transform: translateY({dragOffset}px); transition: {isDragging
					? 'none'
					: 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'}"
				ontouchstart={onDragStart}
				ontouchmove={onDragMove}
				ontouchend={onDragEnd}
				role="dialog"
				tabindex="-1"
				aria-labelledby="trade-title"
			>
				<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden"></div>

				<div class="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 id="trade-title" class="font-serif text-lg font-semibold">{title}</h2>
						<p class="mt-0.5 text-sm text-muted-foreground">{stock.name}</p>
					</div>
					<button
						type="button"
						class="hidden text-muted-foreground hover:text-foreground sm:block"
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
				<div class="mb-1 flex items-stretch gap-2">
					<button
						type="button"
						class="flex h-10 w-12 items-center justify-center border border-input bg-background text-lg font-semibold text-muted-foreground transition-colors hover:bg-muted active:bg-secondary sm:hidden"
						onclick={() => (quantity = Math.max(1, quantity - 1))}
						aria-label="Decrease quantity"
					>−</button>
					<input
						id="trade-quantity"
						type="number"
						min="1"
						max={maxQuantity}
						bind:value={quantity}
						class="h-10 min-w-0 flex-1 border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
					/>
					<button
						type="button"
						class="flex h-10 w-12 items-center justify-center border border-input bg-background text-lg font-semibold text-muted-foreground transition-colors hover:bg-muted active:bg-secondary sm:hidden"
						onclick={() => (quantity = Math.min(maxQuantity, quantity + 1))}
						aria-label="Increase quantity"
					>+</button>
				</div>
				<p class="mb-4 text-xs text-muted-foreground">
					{mode === 'sell'
						? `You own up to ${maxQuantity} shares`
						: `Estimated total: ${formatCurrency(total)}`}
				</p>

				{#if error}
					<p class="mb-3 text-sm text-negative">{error}</p>
				{/if}

				<div class="flex gap-2">
					<NobleButton variant="secondary" type="button" class="flex-1" onclick={close}>
						Cancel
					</NobleButton>
					<NobleButton type="button" class="flex-1" disabled={submitting} onclick={submit}>
						{submitting ? '…' : mode === 'buy' ? 'Confirm buy' : 'Confirm sell'}
					</NobleButton>
				</div>
			</div>
			<div
				class="absolute inset-x-0 h-24 bg-card sm:hidden"
				style="top: 100%; transform: translateY({dragOffset}px); transition: {isDragging
					? 'none'
					: 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'}"
			></div>
		</div>
	</div>
{/if}
