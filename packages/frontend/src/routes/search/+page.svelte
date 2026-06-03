<script lang="ts">
	import { marketStore } from '$lib/stores/market.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StockCard from '$lib/components/app/StockCard.svelte';
	import LivePill from '$lib/components/app/LivePill.svelte';
	import { Search, Flame } from '@lucide/svelte';

	let query = $state('');
	const results = $derived(marketStore.search(query));
	const showTrending = $derived(query.trim() === '');
</script>

<div class="page-shell">
	<div class="page-header-block">
		<PageHeader title="Market" subtitle="Discover and trade stocks on the ScaleRepublic" />
	</div>

	<div class="relative mb-8">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			type="text"
			bind:value={query}
			placeholder="Search by ticker or company name…"
			class="h-10 w-full border border-input bg-card pr-4 pl-10 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
		/>
	</div>

	{#if showTrending}
		<div class="mb-5 flex items-center gap-3">
			<div class="flex items-center gap-2.5">
				<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Trending Today</h2>
				<LivePill />
			</div>
			<p class="text-xs text-muted-foreground">Top movers by daily change</p>
		</div>

		<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
			{#each marketStore.trending as stock (stock.ticker)}
				<StockCard {stock} />
			{/each}
		</div>

		<div class="section-heading mt-10">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">All Stocks</h2>
			<span class="text-xs text-muted-foreground">{marketStore.stocks.length} listed</span>
		</div>

		<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
			{#each marketStore.stocks as stock (stock.ticker)}
				<StockCard {stock} />
			{/each}
		</div>
	{:else}
		<div class="mb-5 flex items-center justify-between">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Results</h2>
			<span class="border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
				{results.length}
				{results.length === 1 ? 'stock' : 'stocks'} found
			</span>
		</div>

		{#if results.length === 0}
			<div class="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
				<Flame class="mb-3 size-7 text-muted-foreground/40" />
				<p class="font-serif text-base font-semibold text-muted-foreground">
					No results for "{query}"
				</p>
				<p class="mt-1 text-sm text-muted-foreground">Try a different ticker or company name.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
				{#each results as stock (stock.ticker)}
					<StockCard {stock} />
				{/each}
			</div>
		{/if}
	{/if}
</div>
