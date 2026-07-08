<script lang="ts">
	import { getPortfolio } from '$lib/data/portfolio.svelte';
	import { getUserProfile } from '$lib/data/user.svelte';
	import { getPerformance } from '$lib/data/performance.svelte';
	import type { PerformanceGranularity } from '$lib/performance-history';
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

	let granularity = $state<PerformanceGranularity>('monthly');

	const portfolio = getPortfolio();
	const account = getUserProfile();
	const performance = getPerformance(() => granularity);

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader title="Portfolio" subtitle={today} />
		{#if account.profile.rank}
			<RankPill rank={account.profile.rank} />
		{/if}
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolio.summary.totalValue)}
			change={portfolio.summary.dayChange}
			changePct={portfolio.summary.dayChangePercent}
			accent
		/>
		<StatCard label="Cash Available" value={formatCurrency(portfolio.summary.cashBalance)} />
		<StatCard
			label="Total Return"
			value={formatCurrency(portfolio.summary.totalPnl)}
			change={portfolio.summary.totalPnl}
			changePct={portfolio.summary.totalPnlPercent}
			changeShowAmount={false}
		/>
	</div>

	<div class="mb-8">
		<PerformanceChart data={performance.data} loading={performance.isLoading} bind:granularity />
	</div>

	<SectionHeading
		title="Holdings"
		badge="{portfolio.holdings.length} {portfolio.holdings.length === 1 ? 'position' : 'positions'}"
	/>

	{#if portfolio.holdings.length === 0}
		<EmptyState
			title="No positions yet."
			description="Head to the Market to place your first trade."
		>
			<NobleButton href="/search" class="mt-5 px-5">Browse Market</NobleButton>
		</EmptyState>
	{:else}
		<HoldingsTable holdings={portfolio.holdings} />

		<PortfolioTotals
			holdingsValue={portfolio.summary.holdingsValue}
			cashBalance={portfolio.summary.cashBalance}
			totalValue={portfolio.summary.totalValue}
		/>
	{/if}

	<LimitOrdersSection />
</div>
