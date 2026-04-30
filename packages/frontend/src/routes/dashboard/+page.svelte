<script lang="ts">
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import ChangeIndicator from '$lib/components/app/ChangeIndicator.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Trophy } from '@lucide/svelte';

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
</script>

<div class="mx-auto max-w-5xl px-4 py-8 md:px-8">
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<PageHeader title="Portfolio" subtitle={today} />
		{#if userStore.profile.rank}
			<div class="flex w-full items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 sm:w-auto sm:justify-start">
				<Trophy class="size-4 text-accent" />
				<div class="text-right">
					<p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rank</p>
					<p class="font-serif text-lg font-bold leading-none text-accent">#{userStore.profile.rank}</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
		<StatCard
			label="Total Value"
			value={formatCurrency(portfolioStore.summary.totalValue)}
			change={portfolioStore.summary.dayChange}
			changePct={portfolioStore.summary.dayChangePercent}
			accent
		/>
		<StatCard
			label="Cash Available"
			value={formatCurrency(portfolioStore.summary.cashBalance)}
		/>
		<StatCard
			label="Total Return"
			value={formatCurrency(portfolioStore.summary.totalPnl)}
		>
			{#snippet children()}
				<ChangeIndicator
					amount={portfolioStore.summary.totalPnl}
					percent={portfolioStore.summary.totalPnlPercent}
					showAmount={false}
					size="sm"
				/>
			{/snippet}
		</StatCard>
	</div>

	<div class="mb-2 mt-10 flex items-center justify-between">
		<h2 class="font-serif text-xl font-bold text-primary">Holdings</h2>
		<span class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
			{portfolioStore.holdings.length}
			{portfolioStore.holdings.length === 1 ? 'position' : 'positions'}
		</span>
	</div>

	<div class="mb-6 h-px w-full bg-border"></div>

	{#if portfolioStore.holdings.length === 0}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
			<p class="font-serif text-lg font-semibold text-muted-foreground">No positions yet.</p>
			<p class="mt-1.5 text-sm text-muted-foreground">Head to the Market to place your first trade.</p>
			<NobleButton href="/search" class="mt-6 px-5">
				Browse Market
			</NobleButton>
		</div>
	{:else}
		<HoldingsTable holdings={portfolioStore.holdings} />

		<div class="mt-6 grid gap-4 rounded-xl border border-border bg-muted/30 px-5 py-4 sm:grid-cols-3">
			<div>
				<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio Value</p>
				<p class="mt-1 font-serif text-xl font-bold text-primary">{formatCurrency(portfolioStore.summary.holdingsValue)}</p>
			</div>
			<div class="sm:text-right">
				<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cash Available</p>
				<p class="mt-1 font-serif text-xl font-bold text-primary">{formatCurrency(portfolioStore.summary.cashBalance)}</p>
			</div>
			<div class="sm:text-right">
				<p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
				<p class="mt-1 font-serif text-xl font-bold text-primary">{formatCurrency(portfolioStore.summary.totalValue)}</p>
			</div>
		</div>
	{/if}
</div>
