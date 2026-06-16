<script lang="ts">
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import PerformanceChart from '$lib/components/app/PerformanceChart.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { demoMarketStore } from '$lib/stores/demo-market.svelte';
	import { marketRevisionStore } from '$lib/stores/market-revision.svelte';
	import { api, parseApiData } from '$lib/api/client';
	import type { BackendPerformancePoint, BackendPortfolioPayload } from '$lib/api/backend-types';
	import { mapPortfolioPayload, mapTraderHoldings, mapTraderSummary } from '$lib/api/mappers';
	import type { PerformanceGranularity } from '$lib/stores/performance.svelte';
	import type { PerformancePoint } from '$lib/performance-history';
	import type { HoldingWithMarket } from '$lib/types';
	import { cn, formatCurrency, getInitials } from '$lib/utils';
	import { Trophy, Shield } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isCurrentUser = $derived(data.profile.userId === authStore.user?.id);

	let performanceData = $state<PerformancePoint[]>([]);
	let performanceLoading = $state(false);
	let granularity = $state<PerformanceGranularity>('daily');
	let holdings = $state<HoldingWithMarket[]>(data.holdings);
	let summary = $state(data.summary);

	async function loadPerformance() {
		performanceLoading = true;
		try {
			const res = await api.api.v1.users[':id'].performance.$get({
				param: { id: data.profile.userId },
				query: { granularity }
			});
			performanceData = await parseApiData<BackendPerformancePoint[]>(res);
		} catch {
			performanceData = [];
		} finally {
			performanceLoading = false;
		}
	}

	async function loadPortfolio() {
		try {
			const res = await api.api.v1.users[':id'].portfolio.$get({
				param: { id: data.profile.userId }
			});
			const portfolioPayload = await parseApiData<BackendPortfolioPayload>(res);
			const portfolio = mapPortfolioPayload(portfolioPayload);
			holdings = mapTraderHoldings(portfolio);
			summary = mapTraderSummary(portfolio, holdings);
		} catch {
			holdings = [];
		}
	}

	async function reloadTraderView() {
		await Promise.all([loadPerformance(), loadPortfolio()]);
	}

	$effect(() => {
		const rev = marketRevisionStore.revision;
		const debugRev = demoMarketStore.revision;
		const g = granularity;
		void rev;
		void debugRev;
		void g;
		void reloadTraderView();
	});
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader
			title={data.profile.name}
			subtitle={isCurrentUser ? 'Your public trader profile' : 'Trader performance overview'}
		/>
		{#if data.profile.rank}
			<div class="status-pill">
				<Trophy class="size-4 text-accent" />
				<div class="text-right">
					<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
						Rank
					</p>
					<p class="font-serif text-lg leading-none font-bold text-foreground">
						#{data.profile.rank}
					</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="mb-6 flex items-center gap-3">
		<div
			class="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-sm font-bold text-foreground"
		>
			{getInitials(data.profile.name)}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if data.profile.isDefaulted}
				<span
					class="inline-flex items-center gap-1 border border-negative/30 bg-negative/8 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-negative uppercase"
				>
					<Shield class="size-3" />
					Suspended
				</span>
			{/if}
			{#if data.profile.penaltyCounter > 0}
				<span
					class="border border-border bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground"
				>
					{data.profile.penaltyCounter} default{data.profile.penaltyCounter === 1 ? '' : 's'}
				</span>
			{/if}
		</div>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
		<StatCard label="Net Worth" value={formatCurrency(summary.totalValue)} accent />
		<StatCard
			label="Total Return"
			value={formatCurrency(summary.totalPnl)}
			change={summary.totalPnl}
			changePct={summary.totalPnlPercent}
			changeShowAmount={false}
		/>
		<StatCard label="Cash" value={formatCurrency(summary.cashBalance)} />
		<StatCard label="Holdings" value={formatCurrency(summary.holdingsValue)} />
	</div>

	<div class="mb-8">
		<PerformanceChart data={performanceData} loading={performanceLoading} bind:granularity />
	</div>

	<div class="section-heading">
		<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Holdings</h2>
		<span
			class="border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{holdings.length}
			{holdings.length === 1 ? 'position' : 'positions'}
		</span>
	</div>

	{#if holdings.length === 0}
		<div
			class={cn(
				'flex flex-col items-center justify-center border border-dashed border-border py-16 text-center'
			)}
		>
			<p class="font-serif text-base font-semibold text-muted-foreground">No open positions.</p>
		</div>
	{:else}
		<HoldingsTable {holdings} readOnly />
	{/if}
</div>
