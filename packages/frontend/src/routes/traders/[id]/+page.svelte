<!--
  Purpose: Display a trader's public holdings and performance.
-->
<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import PerformanceChart from '$lib/components/app/PerformanceChart.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import { getTrader } from '$lib/data/trader.svelte';
	import type { PerformanceGranularity } from '$lib/performance-history';
	import { cn, formatCurrency, getInitials } from '$lib/utils';
	import { Trophy, Shield } from '@lucide/svelte';

	let granularity = $state<PerformanceGranularity>('monthly');
	const trader = getTrader(
		() => page.params.id ?? '',
		() => granularity
	);
</script>

<div class="page-shell">
	{#if trader.notFound}
		<div
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center"
		>
			<p class="font-serif text-base font-semibold text-muted-foreground">Trader not found.</p>
		</div>
	{:else}
		<div class="page-header-row">
			<PageHeader
				title={trader.profile?.name ?? ''}
				subtitle={trader.isCurrentUser
					? 'Your public trader profile'
					: 'Trader performance overview'}
			/>
			{#if trader.profile?.rank}
				<div class="status-pill">
					<Trophy class="size-4 text-accent" />
					<div class="text-right">
						<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
							Rank
						</p>
						<p class="font-serif text-lg leading-none font-bold text-foreground">
							#{trader.profile.rank}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="mb-6 flex items-center gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground"
			>
				{getInitials(trader.profile?.name ?? '')}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if trader.profile?.isDefaulted}
					<span
						class="inline-flex items-center gap-1 rounded-md border border-negative/30 bg-negative/8 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-negative uppercase"
					>
						<Shield class="size-3" />
						Suspended
					</span>
				{/if}
				{#if (trader.profile?.penaltyCounter ?? 0) > 0}
					<span
						class="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground"
					>
						{trader.profile?.penaltyCounter} default{trader.profile?.penaltyCounter === 1
							? ''
							: 's'}
					</span>
				{/if}
			</div>
		</div>

		<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
			<StatCard label="Net Worth" value={formatCurrency(trader.summary.totalValue)} accent />
			<StatCard
				label="Total Return"
				value={formatCurrency(trader.summary.totalPnl)}
				change={trader.summary.totalPnl}
				changePct={trader.summary.totalPnlPercent}
				changeShowAmount={false}
			/>
			<StatCard label="Cash" value={formatCurrency(trader.summary.cashBalance)} />
			<StatCard label="Holdings" value={formatCurrency(trader.summary.holdingsValue)} />
		</div>

		<div class="mb-8">
			<PerformanceChart
				data={trader.performance}
				loading={trader.performanceLoading}
				bind:granularity
			/>
		</div>

		<div class="section-heading">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Holdings
			</h2>
			<span
				class="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
			>
				{trader.holdings.length}
				{trader.holdings.length === 1 ? 'position' : 'positions'}
			</span>
		</div>

		{#if trader.holdings.length === 0}
			<div
				class={cn(
					'flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center'
				)}
			>
				<p class="font-serif text-base font-semibold text-muted-foreground">No open positions.</p>
			</div>
		{:else}
			<HoldingsTable holdings={trader.holdings} readOnly />
		{/if}
	{/if}
</div>
