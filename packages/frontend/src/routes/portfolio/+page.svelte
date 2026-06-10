<script lang="ts">
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';

	const sectorBreakdown = $derived(
		(() => {
			const total = portfolioStore.summary.holdingsValue;
			if (total === 0) return [];

			const sectors: Record<string, number> = {};
			for (const h of portfolioStore.holdings) {
				const sector = h.stock.sector;
				sectors[sector] = (sectors[sector] ?? 0) + h.currentValue;
			}
			return Object.entries(sectors)
				.map(([sector, value]) => ({ sector, value, percent: (value / total) * 100 }))
				.sort((a, b) => b.value - a.value);
		})()
	);
</script>

<div class="page-shell">
	<div class="page-header-block">
		<PageHeader title="My Portfolio" subtitle="Your positions, performance & sector allocation" />
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolioStore.summary.totalValue)}
			change={portfolioStore.summary.dayChange}
			changePct={portfolioStore.summary.dayChangePercent}
			accent
		/>
		<StatCard
			label="Total Return"
			value={formatCurrency(portfolioStore.summary.totalPnl)}
			change={portfolioStore.summary.totalPnl}
			changePct={portfolioStore.summary.totalPnlPercent}
			changeShowAmount={false}
		/>
		<StatCard label="Cash Available" value={formatCurrency(portfolioStore.summary.cashBalance)} />
	</div>

	{#if sectorBreakdown.length > 0}
		<div class="section-heading mt-10">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Sector Allocation
			</h2>
			<span class="text-xs text-muted-foreground"
				>{formatCurrency(portfolioStore.summary.holdingsValue)} invested</span
			>
		</div>

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
							class="border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
						>
							{percent.toFixed(1)}%
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="section-heading mt-8">
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
			<p class="mt-1.5 text-sm text-muted-foreground">
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
