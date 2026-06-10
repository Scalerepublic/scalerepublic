<script lang="ts">
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import PerformanceChart from '$lib/components/app/PerformanceChart.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Trophy } from '@lucide/svelte';

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const performanceHistory = $derived.by(() => portfolioStore.chartHistory);
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader title="Portfolio" subtitle={today} />
		{#if userStore.profile.rank}
			<div class="status-pill">
				<Trophy class="size-4 text-accent" />
				<div class="text-right">
					<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
						Rank
					</p>
					<p class="font-serif text-lg leading-none font-bold text-foreground">
						#{userStore.profile.rank}
					</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolioStore.summary.totalValue)}
			change={portfolioStore.summary.dayChange}
			changePct={portfolioStore.summary.dayChangePercent}
			accent
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
		<PerformanceChart data={performanceHistory} />
	</div>

	<div class="section-heading">
		<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Holdings</h2>
		<span
			class="border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{portfolioStore.holdings.length}
			{portfolioStore.holdings.length === 1 ? 'position' : 'positions'}
		</span>
	</div>

	{#if portfolioStore.holdings.length === 0}
		<div
			class="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center"
		>
			<p class="font-serif text-base font-semibold text-muted-foreground">No positions yet.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Head to the Market to place your first trade.
			</p>
			<NobleButton href="/search" class="mt-5 px-5">Browse Market</NobleButton>
		</div>
	{:else}
		<HoldingsTable holdings={portfolioStore.holdings} />

		<div class="mt-6 grid gap-0 border border-border sm:grid-cols-3">
			<div class="border-b border-border px-5 py-4 sm:border-r sm:border-b-0">
				<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Portfolio Value
				</p>
				<p class="mt-1.5 font-serif text-xl font-bold text-primary">
					{formatCurrency(portfolioStore.summary.holdingsValue)}
				</p>
			</div>
			<div class="border-b border-border px-5 py-4 sm:border-r sm:border-b-0 sm:text-right">
				<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Cash Available
				</p>
				<p class="mt-1.5 font-serif text-xl font-bold text-primary">
					{formatCurrency(portfolioStore.summary.cashBalance)}
				</p>
			</div>
			<div class="px-5 py-4 sm:text-right">
				<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Total
				</p>
				<p class="mt-1.5 font-serif text-xl font-bold text-primary">
					{formatCurrency(portfolioStore.summary.totalValue)}
				</p>
			</div>
		</div>
	{/if}
</div>
