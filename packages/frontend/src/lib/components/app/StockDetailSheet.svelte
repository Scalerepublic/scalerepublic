<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import NobleButton from './NobleButton.svelte';
	import PerformanceChart from './PerformanceChart.svelte';
	import TradeSheet from './TradeSheet.svelte';
	import { api, parseApiData } from '$lib/api/client';
	import type { BackendStockDetail } from '$lib/api/backend-types';
	import type { PerformanceGranularity, PerformancePoint } from '$lib/performance-history';
	import { getCachedStockDetail, setCachedStockDetail } from '$lib/stores/stock-detail-cache';
	import { marketStore } from '$lib/stores/market.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Stock } from '$lib/types';
	import { portal } from '$lib/actions/portal';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Loader2, X } from '@lucide/svelte';

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

	let detail = $state<BackendStockDetail | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let tradeOpen = $state(false);
	let activeTicker = $state<string | null>(null);
	let chartGranularity = $state<PerformanceGranularity>('daily');

	const STOCK_CHART_HISTORY_DAYS = 30;

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
			return displayPrice - displayPrice / (1 + periodChangePercent / 100);
		}
		return dayChange;
	});
	const description = $derived(
		detail?.stock.description?.trim() ||
			`this stock (${detail?.stock.companyName ?? stock.name}) is good because i like it`
	);

	const chartData = $derived.by((): PerformancePoint[] => {
		const history = detail?.priceHistory ?? [];
		return history.map((point) => ({ date: point.date, value: point.close }));
	});

	const showChart = $derived(chartData.length >= 2);
	const missingMarketData = $derived(!loading && !error && (detail?.priceHistory.length ?? 0) < 2);
	let pollAttempts = $state(0);

	$effect(() => {
		if (!open || !missingMarketData) {
			pollAttempts = 0;
			return;
		}

		if (pollAttempts >= 24) {
			return;
		}

		const ticker = stock.ticker;
		const timeout = window.setTimeout(() => {
			pollAttempts += 1;
			void loadDetail(ticker, { silent: true });
		}, 5000);

		return () => window.clearTimeout(timeout);
	});

	$effect(() => {
		if (!open) {
			document.body.style.overflow = '';
			return;
		}

		document.body.style.overflow = 'hidden';

		const ticker = stock.ticker;
		if (activeTicker === ticker) return;

		activeTicker = ticker;
		detail = null;
		chartGranularity = 'daily';
		error = null;

		const cached = getCachedStockDetail(ticker);
		if (cached && cached.priceHistory.length >= 2) {
			detail = cached;
			loading = false;
			marketStore.applyDetailMetrics(ticker, {
				currentPrice: resolveDetailPrice(cached, stock.currentPrice),
				dayChange: cached.performance.dayChange,
				dayChangePercent: cached.performance.dayChangePercent,
				periodChangePercent: cached.performance.periodChangePercent
			});
			return;
		}

		void loadDetail(ticker);
	});

	async function loadDetail(ticker: string, options?: { silent?: boolean }) {
		if (!options?.silent) {
			loading = true;
			error = null;
		}
		try {
			const res = await api.api.v1.stocks[':ticker'].detail.$get({
				param: { ticker },
				query: { historyDays: String(STOCK_CHART_HISTORY_DAYS) }
			});
			const loaded = await parseApiData<BackendStockDetail>(res);
			if (activeTicker !== ticker) return;
			detail = loaded;
			setCachedStockDetail(ticker, loaded);
			const resolvedPrice = resolveDetailPrice(loaded, stock.currentPrice);
			marketStore.applyDetailMetrics(ticker, {
				currentPrice: resolvedPrice,
				dayChange: loaded.performance.dayChange,
				dayChangePercent: loaded.performance.dayChangePercent,
				periodChangePercent: loaded.performance.periodChangePercent
			});
		} catch (e) {
			if (activeTicker !== ticker) return;
			error = e instanceof Error ? e.message : 'Could not load stock details.';
		} finally {
			if (activeTicker === ticker) {
				loading = false;
			}
		}
	}

	function close() {
		open = false;
		activeTicker = null;
	}

	function onBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
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
							<p class="text-sm text-muted-foreground">
								{#if pollAttempts < 24}
									Loading market data from backfill queue…
								{:else}
									Market data is not cached yet. Open again later or run a catalog backfill for this
									ticker.
								{/if}
							</p>
						{/if}

						<div>
							<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								About
							</p>
							<p class="mt-2 text-sm leading-relaxed text-foreground/90">{description}</p>
						</div>

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

			<div class="border-t border-border px-5 py-4">
				<NobleButton type="button" class="h-10 w-full" onclick={() => (tradeOpen = true)}>
					Buy {stock.ticker}
				</NobleButton>
			</div>
		</div>
	</div>
{/if}

<TradeSheet bind:open={tradeOpen} {stock} mode="buy" />
