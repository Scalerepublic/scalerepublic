<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import { cn, formatCurrency, formatPercent, getInitials } from '$lib/utils';
	import { getLeaderboard } from '$lib/data/leaderboard.svelte';
	import { getUserSearch } from '$lib/data/user.svelte';
	import { Trophy, Search } from '@lucide/svelte';

	let searchQuery = $state('');
	let debouncedSearch = $state('');
	let searchOpen = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	const board = getLeaderboard();
	const search = getUserSearch(() => debouncedSearch);

	function formatDefaultDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short'
		});
	}

	function handleSearchInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		searchQuery = value;
		if (searchTimer) clearTimeout(searchTimer);
		const trimmed = value.trim();
		if (trimmed.length < 2) {
			debouncedSearch = '';
			searchOpen = false;
			return;
		}
		searchTimer = setTimeout(() => {
			debouncedSearch = trimmed;
			searchOpen = true;
		}, 300);
	}

	function handleSearchBlur() {
		setTimeout(() => {
			searchOpen = false;
		}, 150);
	}
</script>

<svelte:window onclick={() => (searchOpen = false)} />

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader
			title="Leaderboard"
			subtitle="Ranked by current net worth · toy exchange rules apply"
		/>
	</div>

	<div class="relative mb-6">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			type="text"
			value={searchQuery}
			oninput={handleSearchInput}
			onfocus={() => {
				if (search.results.length > 0) searchOpen = true;
			}}
			onblur={handleSearchBlur}
			placeholder="Search traders by name or email…"
			class="h-10 w-full rounded-lg border border-input bg-card pr-4 pl-10 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
		/>
		{#if searchOpen && search.results.length > 0}
			<div
				class="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
			>
				{#each search.results as result (result.userId)}
					<a
						href={resolve(`/traders/${result.userId}`)}
						class="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm transition-colors first:border-t-0 hover:bg-muted/40"
						onmousedown={(e) => e.preventDefault()}
					>
						<span class="font-medium text-foreground">{result.name}</span>
						<div class="flex items-center gap-3 text-xs text-muted-foreground">
							{#if result.rank}
								<span class="font-mono">#{result.rank}</span>
							{/if}
							{#if result.netWorth !== null}
								<span class="font-mono">{formatCurrency(result.netWorth)}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else if searchOpen && !search.isFetching && searchQuery.trim().length >= 2}
			<div
				class="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
			>
				No traders found
			</div>
		{/if}
	</div>

	{#if board.isError}
		<p
			class="mb-4 rounded-lg border border-negative/30 bg-negative/8 px-4 py-3 text-sm text-negative"
		>
			{board.error instanceof Error ? board.error.message : 'Failed to load leaderboard'}
		</p>
	{/if}

	<div class="overflow-x-auto rounded-xl border border-border">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-b border-border bg-muted">
					<th class="table-th text-left">Rank</th>
					<th class="table-th text-left">Trader</th>
					<th class="table-th text-right">Net Worth</th>
					<th class="table-th hidden text-right sm:table-cell">Holdings</th>
					<th class="table-th hidden text-right md:table-cell">Cash</th>
					<th class="table-th text-right">Defaults</th>
					<th class="table-th text-right">Return</th>
				</tr>
			</thead>
			<tbody>
				{#each board.entries as entry (entry.userId)}
					<tr
						class={cn(
							'border-t border-border/60 transition-colors',
							entry.isCurrentUser ? 'bg-accent/5 hover:bg-accent/8' : 'hover:bg-muted/40'
						)}
					>
						<td class="px-4 py-3.5">
							{#if entry.rank <= 3}
								<div class="flex items-center gap-2">
									<Trophy
										class={cn(
											'size-4 shrink-0',
											entry.rank === 1 && 'text-foreground',
											entry.rank === 2 && 'text-muted-foreground',
											entry.rank === 3 && 'text-muted-foreground/70'
										)}
									/>
									<span class="font-mono font-bold text-primary">#{entry.rank}</span>
								</div>
							{:else}
								<span
									class={cn(
										'font-mono font-semibold',
										entry.isCurrentUser ? 'text-foreground' : 'text-muted-foreground'
									)}
								>
									#{entry.rank}
								</span>
							{/if}
						</td>
						<td class="px-4 py-3.5">
							<a href={resolve(`/traders/${entry.userId}`)} class="flex items-center gap-2.5">
								<div
									class={cn(
										'flex size-6 shrink-0 items-center justify-center text-[10px] font-bold',
										entry.isCurrentUser
											? 'border border-accent/30 bg-accent/10 text-accent'
											: 'border border-border bg-muted text-muted-foreground'
									)}
								>
									{getInitials(entry.name)}
								</div>
								<div class="flex items-center gap-2">
									<span
										class={cn(
											'text-sm',
											entry.isCurrentUser
												? 'font-bold text-foreground'
												: 'font-medium text-foreground'
										)}
									>
										{entry.name}
									</span>
									{#if entry.isCurrentUser}
										<span
											class="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-foreground uppercase"
										>
											You
										</span>
									{/if}
									{#if entry.penalties >= 3}
										<span
											class="rounded-md border border-negative/30 bg-negative/8 px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-negative uppercase"
										>
											Out
										</span>
									{/if}
								</div>
							</a>
						</td>
						<td class="px-4 py-3.5 text-right">
							<span
								class={cn(
									'font-mono font-bold',
									entry.isCurrentUser ? 'text-foreground' : 'text-primary'
								)}
							>
								{formatCurrency(entry.netWorth)}
							</span>
						</td>
						<td class="hidden px-4 py-3.5 text-right font-mono text-muted-foreground sm:table-cell">
							{formatCurrency(entry.holdingsValue)}
						</td>
						<td class="hidden px-4 py-3.5 text-right font-mono text-muted-foreground md:table-cell">
							{formatCurrency(entry.cashBalance)}
						</td>
						<td class="px-4 py-3.5 text-right">
							{#if entry.penalties > 0}
								<div class="inline-flex flex-col items-end gap-0.5">
									<span
										class="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-foreground"
									>
										{entry.penalties}
									</span>
									<span class="text-[10px] text-muted-foreground">
										{formatDefaultDate(entry.lastDefaultedAt)}
									</span>
								</div>
							{:else}
								<span class="font-mono text-xs text-muted-foreground/60">—</span>
							{/if}
						</td>
						<td
							class={cn(
								'px-4 py-3.5 text-right',
								entry.returnPercent >= 0 ? 'text-positive' : 'text-negative'
							)}
						>
							<span
								class={cn(
									'border px-1.5 py-0.5 font-mono text-xs font-semibold',
									entry.returnPercent >= 0
										? 'border-positive/30 bg-positive/8'
										: 'border-negative/30 bg-negative/8'
								)}
							>
								{formatPercent(entry.returnPercent)}
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center text-sm text-muted-foreground">
							No traders on the leaderboard yet.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="mt-5 text-center text-xs text-muted-foreground">
		{board.entries.length} traders competing · Starting capital $1,000.00 · 3 strikes and you're out
	</p>
</div>
