<script lang="ts">
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StatCard from '$lib/components/app/StatCard.svelte';
	import PerformanceChart from '$lib/components/app/PerformanceChart.svelte';
	import HoldingsTable from '$lib/components/app/HoldingsTable.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { api, parseApiData } from '$lib/api/client';
	import type { BackendPerformancePoint } from '$lib/api/backend-types';
	import type { PerformanceGranularity } from '$lib/stores/performance.svelte';
	import type { PerformancePoint } from '$lib/performance-history';
	import { cn, formatCurrency, getInitials } from '$lib/utils';
	import { Trophy, Shield } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isCurrentUser = $derived(data.profile.userId === authStore.user?.id);

	let performanceData = $state<PerformancePoint[]>([]);
	let performanceLoading = $state(false);
	let granularity = $state<PerformanceGranularity>('daily');

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

	$effect(() => {
		const g = granularity;
		void g;
		void loadPerformance();
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
			{#if isCurrentUser}
				<span
					class="border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-foreground uppercase"
				>
					You
				</span>
			{/if}
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
		<StatCard label="Net Worth" value={formatCurrency(data.summary.totalValue)} accent />
		<StatCard
			label="Total Return"
			value={formatCurrency(data.summary.totalPnl)}
			change={data.summary.totalPnl}
			changePct={data.summary.totalPnlPercent}
			changeShowAmount={false}
		/>
		<StatCard label="Cash" value={formatCurrency(data.summary.cashBalance)} />
		<StatCard label="Holdings" value={formatCurrency(data.summary.holdingsValue)} />
	</div>

	<div class="mb-8">
		<PerformanceChart
			data={performanceData}
			loading={performanceLoading}
			bind:granularity
		/>
	</div>

	<div class="section-heading">
		<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Holdings</h2>
		<span
			class="border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{data.holdings.length}
			{data.holdings.length === 1 ? 'position' : 'positions'}
		</span>
	</div>

	{#if data.holdings.length === 0}
		<div
			class={cn(
				'flex flex-col items-center justify-center border border-dashed border-border py-16 text-center'
			)}
		>
			<p class="font-serif text-base font-semibold text-muted-foreground">No open positions.</p>
		</div>
	{:else}
		<HoldingsTable holdings={data.holdings} readOnly />
	{/if}
</div>
