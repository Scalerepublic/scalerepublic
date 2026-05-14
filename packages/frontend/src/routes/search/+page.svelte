<script lang="ts">
	import { marketStore } from '$lib/stores/market.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StockCard from '$lib/components/app/StockCard.svelte';
	import { Search, Flame } from '@lucide/svelte';

	let query = $state('');
	const results = $derived(marketStore.search(query));
	const showTrending = $derived(query.trim() === '');
</script>

<div class="mx-auto max-w-5xl px-4 py-8 md:px-8">
	<PageHeader title="Market" subtitle="Discover and trade stocks on the ScaleRepublic" />

	<div class="relative mb-8">
		<Search
			class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			type="text"
			bind:value={query}
			placeholder="Search by ticker or company name…"
			class="h-11 w-full rounded-xl border border-input bg-card pr-4 pl-10 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
		/>
	</div>

	{#if showTrending}
		<div class="mb-5 flex items-center gap-3">
			<div class="flex items-center gap-2">
				<h2 class="font-serif text-xl font-bold text-primary">Trending Today</h2>
				<div
					class="flex items-center gap-1.5 rounded-full border border-positive/20 bg-positive/10 px-2.5 py-1"
				>
					<span class="relative flex size-1.5">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75"
						></span>
						<span class="relative inline-flex size-1.5 rounded-full bg-positive"></span>
					</span>
					<span class="text-[10px] font-semibold tracking-widest text-positive uppercase">Live</span
					>
				</div>
			</div>
			<p class="text-xs text-muted-foreground">Top movers by daily change</p>
		</div>

		<div class="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-3">
			{#each marketStore.trending as stock (stock.ticker)}
				<StockCard {stock} />
			{/each}
		</div>

		<div class="mt-12 mb-5 flex items-center justify-between">
			<h2 class="font-serif text-xl font-bold text-primary">All Stocks</h2>
			<span class="text-sm text-muted-foreground">{marketStore.stocks.length} listed</span>
		</div>

		<div class="mb-6 h-px w-full bg-border"></div>

		<div class="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-3">
			{#each marketStore.stocks as stock (stock.ticker)}
				<StockCard {stock} />
			{/each}
		</div>
	{:else}
		<div class="mb-5 flex items-center justify-between">
			<h2 class="font-serif text-xl font-bold text-primary">Results</h2>
			<span
				class="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
			>
				{results.length}
				{results.length === 1 ? 'stock' : 'stocks'} found
			</span>
		</div>

		{#if results.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center"
			>
				<Flame class="mb-3 size-8 text-muted-foreground/40" />
				<p class="font-serif text-lg font-semibold text-muted-foreground">
					No results for "{query}"
				</p>
				<p class="mt-1 text-sm text-muted-foreground">Try a different ticker or company name.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-3">
				{#each results as stock (stock.ticker)}
					<StockCard {stock} />
				{/each}
			</div>
		{/if}
	{/if}
</div>
