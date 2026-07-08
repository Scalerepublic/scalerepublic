<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import NobleButton from './NobleButton.svelte';
	import PerformanceChart from './PerformanceChart.svelte';
	import BuyTradeSheet from './BuyTradeSheet.svelte';
	import LimitOrderSheet from './LimitOrderSheet.svelte';
	import type { BackendStockDetail } from '$lib/api/backend-types';
	import { getStockDetail } from '$lib/data/market.svelte';
	import type { PerformanceGranularity, PerformancePoint } from '$lib/performance-history';
	import { periodChangeToAmount } from '$lib/stock-performance';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';
	import { portal } from '$lib/actions/portal';
	import { fade } from 'svelte/transition';
	import { panelTransition } from '$lib/transitions';
	import { Loader2, X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		stock
	}: {
		open?: boolean;
		stock: Stock;
	} = $props();

	let tradeOpen = $state(false);
	let limitOpen = $state(false);
	let chartGranularity = $state<PerformanceGranularity>('monthly');

	const stockDetail = getStockDetail(
		() => stock.ticker,
		() => open
	);
	const detail = $derived(stockDetail.detail);
	const loading = $derived(stockDetail.isLoading);
	const error = $derived(
		stockDetail.isError
			? stockDetail.error instanceof Error
				? stockDetail.error.message
				: 'Could not load stock details.'
			: null
	);

	function resolveDetailPrice(loaded: BackendStockDetail | null, fallbackPrice: number): number {
		if (loaded?.performance.latestPrice != null) {
			return loaded.performance.latestPrice;
		}
		const lastBar = loaded?.priceHistory.at(-1)?.close;
		if (lastBar != null) {
			return lastBar;
		}
		return fallbackPrice;
	}

	const displayPrice = $derived(resolveDetailPrice(detail, stock.currentPrice));
	const periodChangePercent = $derived(
		detail?.performance.periodChangePercent ?? stock.periodChangePercent ?? null
	);
	const dayChange = $derived(detail?.performance.dayChange ?? stock.dayChange);
	const dayChangePercent = $derived(detail?.performance.dayChangePercent ?? stock.dayChangePercent);
	const displayChangePercent = $derived(periodChangePercent ?? dayChangePercent);
	const displayChangeAmount = $derived.by(() => {
		if (periodChangePercent !== null) {
			return periodChangeToAmount(displayPrice, periodChangePercent);
		}
		return dayChange;
	});
	const description = $derived(detail?.stock.description?.trim() || null);

	const chartData = $derived.by((): PerformancePoint[] => {
		const history = detail?.priceHistory ?? [];
		return history.map((point) => ({ date: point.date, value: point.close }));
	});

	const showChart = $derived(chartData.length >= 2);
	const missingMarketData = $derived(detail != null && chartData.length < 2);
	const canTrade = $derived(showChart);

	$effect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		void stock.ticker;
		chartGranularity = 'monthly';
	});

	function close() {
		tradeOpen = false;
		limitOpen = false;
		open = false;
	}

	function onBackdropKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (tradeOpen) {
			tradeOpen = false;
			return;
		}
		if (limitOpen) {
			limitOpen = false;
			return;
		}
		close();
	}
</script>

<svelte:window onkeydown={onBackdropKeydown} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<button
			type="button"
			class="absolute inset-0 bg-background/80 backdrop-blur-sm"
			aria-label="Close stock details"
			onclick={close}
		></button>

		<div
			class="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col border border-border bg-card shadow-xl sm:max-h-[85vh]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stock-detail-title"
			transition:panelTransition
		>
			<div class="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
				<div class="min-w-0">
					<p class="font-mono text-2xl font-bold text-primary">{stock.ticker}</p>
					<h2
						id="stock-detail-title"
						class="mt-1 truncate font-serif text-base font-semibold text-foreground"
					>
						{detail?.stock.companyName ?? stock.name}
					</h2>
					{#if detail?.stock.exchange && detail.stock.exchange !== 'UNKNOWN'}
						<p class="mt-1 text-xs text-muted-foreground">{detail.stock.exchange}</p>
					{/if}
				</div>
				<button
					type="button"
					class="shrink-0 border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Close"
					onclick={close}
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="overflow-y-auto px-5 py-4">
				{#if loading && !detail}
					<div class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
						<Loader2 class="size-4 animate-spin" />
						Loading details…
					</div>
				{:else if error && !detail}
					<div
						role="alert"
						class="border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
					>
						{error}
					</div>
				{:else}
					<div class="space-y-5">
						<div>
							<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Price
							</p>
							<div class="mt-2 flex flex-wrap items-end justify-between gap-3">
								<p class="font-mono text-3xl font-bold text-foreground">
									{formatCurrency(displayPrice)}
								</p>
								<ChangeIndicator amount={displayChangeAmount} percent={displayChangePercent} />
							</div>
						</div>

						{#if showChart}
							<div>
								<p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Recent performance
								</p>
								<div class="border border-border bg-muted/30 p-3">
									<PerformanceChart
										data={chartData}
										mode="stock"
										bind:granularity={chartGranularity}
									/>
								</div>
							</div>
						{:else if missingMarketData}
							<p class="text-sm text-muted-foreground">Loading market data from backfill queue…</p>
						{/if}

						{#if description}
							<div>
								<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									About
								</p>
								<p class="mt-2 text-sm leading-relaxed text-foreground/90">{description}</p>
							</div>
						{/if}

						{#if detail?.stock.isAccumulating !== null && detail?.stock.isAccumulating !== undefined}
							<div>
								<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Distribution
								</p>
								<p class="mt-2 text-sm text-foreground">
									{detail.stock.isAccumulating ? 'Accumulating (thesaurierend)' : 'Distributing'}
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex gap-2 border-t border-border px-5 py-4">
				<NobleButton
					variant="secondary"
					type="button"
					class="h-10 flex-1"
					disabled={!canTrade}
					onclick={() => (limitOpen = true)}
				>
					Limit order
				</NobleButton>
				<NobleButton
					type="button"
					class="h-10 flex-1"
					disabled={!canTrade}
					onclick={() => (tradeOpen = true)}
				>
					Buy {stock.ticker}
				</NobleButton>
			</div>
		</div>
	</div>
{/if}

<BuyTradeSheet bind:open={tradeOpen} {stock} />
<LimitOrderSheet bind:open={limitOpen} {stock} />
