<script lang="ts">
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import { performanceStore } from '$lib/stores/performance.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import PerformanceChart from '$lib/components/app/PerformanceChart.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import LimitOrdersSection from '$lib/components/app/LimitOrdersSection.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import EmptyState from '$lib/components/app/EmptyState.svelte';
	import PortfolioTotals from '$lib/components/app/PortfolioTotals.svelte';
	import RankPill from '$lib/components/app/RankPill.svelte';
	import SectionHeading from '$lib/components/app/SectionHeading.svelte';
	import { formatCurrency } from '$lib/utils';

	$effect(() => {
		void portfolioStore.loadLimitOrders();
	});

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	function handleGranularityChange() {
		void performanceStore.load();
	}
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader title="Portfolio" subtitle={today} />
		{#if userStore.profile.rank}
			<RankPill rank={userStore.profile.rank} />
		{/if}
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolioStore.summary.totalValue)}
			change={portfolioStore.summary.dayChange}
			changePct={portfolioStore.summary.dayChangePercent}
		/>
		<StatCard label="Cash Available" value={formatCurrency(portfolioStore.summary.cashBalance)} />
		<StatCard
			label="Total Return"
			value={formatCurrency(portfolioStore.summary.totalPnl)}
			change={portfolioStore.summary.totalPnl}
			changePct={portfolioStore.summary.totalPnlPercent}
			changeShowAmount={false}
		/>
	</div>

	<div class="mb-8">
		<PerformanceChart
			data={performanceStore.data}
			loading={performanceStore.loading}
			bind:granularity={performanceStore.granularity}
			onGranularityChange={handleGranularityChange}
		/>
	</div>

	<SectionHeading
		title="Holdings"
		badge="{portfolioStore.holdings.length} {portfolioStore.holdings.length === 1
			? 'position'
			: 'positions'}"
	/>

	{#if portfolioStore.holdings.length === 0}
		<EmptyState
			title="No positions yet."
			description="Head to the Market to place your first trade."
		>
			<NobleButton href="/search" class="mt-5 px-5">Browse Market</NobleButton>
		</EmptyState>
	{:else}
		<HoldingsTable holdings={portfolioStore.holdings} />

		<PortfolioTotals
			holdingsValue={portfolioStore.summary.holdingsValue}
			cashBalance={portfolioStore.summary.cashBalance}
			totalValue={portfolioStore.summary.totalValue}
		/>
	{/if}

	<LimitOrdersSection />
</div>
