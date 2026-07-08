<script lang="ts">
	import { getSectors, getStockList, getTrending } from '$lib/data/market.svelte';
	import type { StocksListParams } from '$lib/api/queries';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import StockCard from '$lib/components/app/StockCard.svelte';
	import EmptyState from '$lib/components/app/EmptyState.svelte';
	import MarketCategoryCard from '$lib/components/app/MarketCategoryCard.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Layers, Search } from '@lucide/svelte';

	type MarketView = 'home' | 'browse';

	const SECTOR_ACCENTS: Record<string, string> = {
		technology: '#1a3660',
		media: '#7c2d12',
		finance: '#14532d',
		healthcare: '#831843',
		energy: '#854d0e',
		consumer: '#3f3f46'
	};

	const MARKET_PAGE_SIZE = 24;

	let query = $state('');
	let view = $state<MarketView>('home');
	let activeSector = $state<string | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let debouncedSearch = $state('');
	let page = $state(1);

	const trending = getTrending();
	const market = getSectors();

	const browseParams = $derived<StocksListParams>({
		q: debouncedSearch || undefined,
		sector: activeSector ?? undefined,
		page,
		limit: MARKET_PAGE_SIZE
	});
	const browseList = getStockList(
		() => browseParams,
		() => view === 'browse'
	);
	const browse = $derived(browseList.result);
	const totalPages = $derived(browse ? Math.max(1, Math.ceil(browse.total / browse.limit)) : 1);
	const isSearchMode = $derived(query.trim().length > 0);
	const browseTitle = $derived.by(() => {
		if (isSearchMode) {
			return `Results for “${query.trim()}”`;
		}
		if (activeSector) {
			return market.sectors.find((sector) => sector.id === activeSector)?.label ?? 'Browse';
		}
		return 'All Listings';
	});
	const browseSubtitle = $derived.by(() => {
		if (isSearchMode) {
			return 'Server-side search across the full catalog';
		}
		if (activeSector) {
			return market.sectors.find((sector) => sector.id === activeSector)?.description ?? '';
		}
		return 'Alphabetical browse across every active ticker';
	});

	function openBrowse(sector?: string) {
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = null;
		}
		query = '';
		debouncedSearch = '';
		page = 1;
		activeSector = sector ?? null;
		view = 'browse';
	}

	function goHome() {
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = null;
		}
		view = 'home';
		activeSector = null;
		debouncedSearch = '';
		query = '';
		page = 1;
	}

	function handleQueryInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		query = value;

		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = null;
		}

		const trimmed = value.trim();
		if (trimmed.length === 0) {
			debouncedSearch = '';
			if (activeSector) {
				page = 1;
				view = 'browse';
			} else {
				goHome();
			}
			return;
		}

		searchTimer = setTimeout(() => {
			debouncedSearch = trimmed;
			activeSector = null;
			page = 1;
			view = 'browse';
		}, 320);
	}

	function loadPage(nextPage: number) {
		if (nextPage < 1 || nextPage > totalPages) {
			return;
		}
		page = nextPage;
	}
</script>

<div class="page-shell market-page">
	<div class="page-header-block">
		<PageHeader title="Market" subtitle="Discover and trade stocks on the ScaleRepublic" />
	</div>

	<div class="relative mb-8">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			type="text"
			value={query}
			oninput={handleQueryInput}
			placeholder="Search by ticker or company name…"
			class="h-11 w-full border border-input bg-card pr-4 pl-10 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
		/>
	</div>

	{#if view === 'home' && !isSearchMode}
		<section class="market-section">
			<div class="mb-5 flex items-end justify-between gap-4">
				<div>
					<h2 class="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
						Trending Today
					</h2>
					<p class="mt-0.5 text-xs text-muted-foreground">Top movers with live quotes</p>
				</div>
			</div>

			{#if trending.isLoading && trending.stocks.length === 0}
				<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
					{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
						<div class="h-36 animate-pulse border border-border bg-muted/40"></div>
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
					{#each trending.stocks as stock, index (stock.ticker)}
						<div class="market-fade-up" style={`animation-delay: ${index * 45}ms`}>
							<StockCard {stock} />
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="market-section mt-12">
			<div class="mb-5 flex items-end justify-between gap-4">
				<div>
					<h2 class="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
						Browse by Sector
					</h2>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Curated lanes — paginated, never the full dump at once
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
				<button
					type="button"
					class="market-category-card group relative flex min-h-[9.5rem] w-full flex-col justify-between overflow-hidden border border-border bg-card p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/35 md:col-span-2 xl:col-span-3"
					style="--sector-accent: var(--foreground)"
					onclick={() => openBrowse()}
				>
					<span
						class="pointer-events-none absolute inset-y-0 left-0 w-1 bg-foreground transition-[width] duration-200 group-hover:w-1.5"
						aria-hidden="true"
					></span>
					<div
						class="flex flex-col gap-4 pl-2 min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between"
					>
						<div>
							<div
								class="mb-2 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase"
							>
								<Layers class="size-3.5" />
								Full catalog
							</div>
							<p class="font-serif text-2xl font-semibold tracking-tight text-foreground">
								All Listings
							</p>
							<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
								Browse the entire market alphabetically, 24 tickers per page.
							</p>
						</div>
						<p class="font-mono text-sm tracking-widest text-muted-foreground uppercase">
							{market.totalListings.toLocaleString()} tickers
						</p>
					</div>
				</button>

				{#each market.sectors as sector, index (sector.id)}
					<div class="market-fade-up h-full" style={`animation-delay: ${index * 55}ms`}>
						<MarketCategoryCard
							label={sector.label}
							description={sector.description}
							count={sector.count}
							accent={SECTOR_ACCENTS[sector.id] ?? 'var(--accent)'}
							onclick={() => openBrowse(sector.id)}
						/>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<section class="market-section">
			<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div class="flex min-w-0 items-start gap-3">
					<button
						type="button"
						class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
						onclick={goHome}
						aria-label="Back to market home"
					>
						<ArrowLeft class="size-4" />
					</button>
					<div class="min-w-0">
						<h2 class="truncate font-serif text-xl font-semibold text-foreground">{browseTitle}</h2>
						<p class="mt-0.5 text-xs text-muted-foreground">{browseSubtitle}</p>
					</div>
				</div>
				{#if browse}
					<span
						class="border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
					>
						{browse.total.toLocaleString()} matches
					</span>
				{/if}
			</div>

			{#if browseList.isFetching && (!browse || browse.items.length === 0)}
				<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
					{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
						<div class="h-36 animate-pulse border border-border bg-muted/40"></div>
					{/each}
				</div>
			{:else if browse && browse.items.length === 0}
				<EmptyState title="No matches found" description="Try another ticker or return to sectors.">
					{#snippet icon()}
						<Flame class="mb-3 size-7 text-muted-foreground/40" />
					{/snippet}
					<NobleButton type="button" class="mt-5 px-5" onclick={goHome}>Back to Market</NobleButton>
				</EmptyState>
			{:else if browse}
				<div class="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
					{#each browse.items as stock (stock.ticker)}
						<StockCard {stock} />
					{/each}
				</div>

				{#if totalPages > 1}
					<div
						class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
					>
						<p class="text-xs text-muted-foreground">
							Page {browse.page} of {totalPages}
						</p>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="inline-flex h-9 items-center gap-1 border border-border bg-card px-3 text-xs font-medium text-foreground transition enabled:hover:border-foreground/30 disabled:opacity-40"
								disabled={browse.page <= 1}
								onclick={() => loadPage(browse.page - 1)}
							>
								<ChevronLeft class="size-3.5" />
								Prev
							</button>
							<button
								type="button"
								class="inline-flex h-9 items-center gap-1 border border-border bg-card px-3 text-xs font-medium text-foreground transition enabled:hover:border-foreground/30 disabled:opacity-40"
								disabled={browse.page >= totalPages}
								onclick={() => loadPage(browse.page + 1)}
							>
								Next
								<ChevronRight class="size-3.5" />
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</section>
	{/if}
</div>

<style>
	.market-fade-up {
		animation: fade-up 420ms ease both;
	}

	.market-section :global(.market-category-card) {
		animation: fade-up 420ms ease both;
	}
</style>
