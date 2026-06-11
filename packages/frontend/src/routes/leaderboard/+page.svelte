<script lang="ts">
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import { cn, formatCurrency, formatPercent, getInitials } from '$lib/utils';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Trophy } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const leaderboard = $derived(
		data.leaderboard.map((e) => ({
			...e,
			isCurrentUser: e.userId === authStore.user?.id
		}))
	);

	function formatDefaultDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short'
		});
	}
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader
			title="Leaderboard"
			subtitle="Ranked by current net worth · toy exchange rules apply"
		/>
	</div>

	<div class="overflow-x-auto border border-border">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-b border-border bg-muted">
					<th
						class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>Rank</th
					>
					<th
						class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>Trader</th
					>
					<th
						class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>Net Worth</th
					>
					<th
						class="hidden px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase sm:table-cell"
						>Holdings</th
					>
					<th
						class="hidden px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase md:table-cell"
						>Cash</th
					>
					<th
						class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>Defaults</th
					>
					<th
						class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
						>Return</th
					>
				</tr>
			</thead>
			<tbody>
				{#each leaderboard as entry (entry.userId)}
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
							<div class="flex items-center gap-2.5">
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
											class="border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-foreground uppercase"
										>
											You
										</span>
									{/if}
								</div>
							</div>
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
										class="border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-foreground"
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
								{entry.returnPercent >= 0 ? '+' : ''}{formatPercent(entry.returnPercent)}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="mt-5 text-center text-xs text-muted-foreground">
		{leaderboard.length} traders competing · Starting capital $10,000.00 · 3 strikes and you're out
	</p>
</div>
