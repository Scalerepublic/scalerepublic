<!--
  Purpose: Show performance, holdings, transactions, and order management.
-->
<script lang="ts">
	import { getPortfolio } from '$lib/data/portfolio.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import EmptyState from '$lib/components/app/EmptyState.svelte';
	import PortfolioTotals from '$lib/components/app/PortfolioTotals.svelte';
	import SectionHeading from '$lib/components/app/SectionHeading.svelte';
	import { formatCurrency } from '$lib/utils';

	const portfolio = getPortfolio();

	const sectorBreakdown = $derived.by(() => {
		const total = portfolio.summary.holdingsValue;
		if (total === 0) return [];

		const sectors: Record<string, number> = {};
		for (const h of portfolio.holdings) {
			const sector = h.stock.sector;
			sectors[sector] = (sectors[sector] ?? 0) + h.currentValue;
		}
		return Object.entries(sectors)
			.map(([sector, value]) => ({ sector, value, percent: (value / total) * 100 }))
			.sort((a, b) => b.value - a.value);
	});
</script>

<div class="page-shell">
	<div class="page-header-block">
		<PageHeader title="My Portfolio" subtitle="Your positions, performance & sector allocation" />
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolio.summary.totalValue)}
			change={portfolio.summary.dayChange}
			changePct={portfolio.summary.dayChangePercent}
			accent
		/>
		<StatCard
			label="Total Return"
			value={formatCurrency(portfolio.summary.totalPnl)}
			change={portfolio.summary.totalPnl}
			changePct={portfolio.summary.totalPnlPercent}
			changeShowAmount={false}
		/>
		<StatCard label="Cash Available" value={formatCurrency(portfolio.summary.cashBalance)} />
	</div>

	{#if sectorBreakdown.length > 0}
		<SectionHeading title="Sector Allocation" class="mt-10">
			<span class="text-xs text-muted-foreground"
				>{formatCurrency(portfolio.summary.holdingsValue)} invested</span
			>
		</SectionHeading>

		<div class="mt-4 mb-8 grid gap-2.5">
			{#each sectorBreakdown as { sector, value, percent } (sector)}
				<div class="flex items-center gap-4">
					<span class="w-28 shrink-0 text-sm font-medium text-foreground">{sector}</span>
					<div class="relative flex-1 overflow-hidden bg-muted" style="height: 6px;">
						<div class="h-full bg-accent transition-all" style="width: {percent}%;"></div>
					</div>
					<div class="flex w-32 shrink-0 items-center justify-end gap-2 text-right">
						<span class="font-mono text-sm font-semibold text-primary">{formatCurrency(value)}</span
						>
						<span
							class="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
						>
							{percent.toFixed(1)}%
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<SectionHeading
		title="Holdings"
		class="mt-8"
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
</div>
