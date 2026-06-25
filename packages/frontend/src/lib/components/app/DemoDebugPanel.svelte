<script lang="ts">
	import { demoMarketStore } from '$lib/stores/demo-market.svelte';
	import { cn } from '$lib/utils';

	let open = $state(true);
	let crashPercent = $state(50);

	$effect(() => {
		void demoMarketStore.refreshStatus();
	});

	function formatDisplayDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

{#if demoMarketStore.enabled}
	<div
		class={cn(
			'fixed right-4 bottom-4 z-50 w-72 border border-border bg-card shadow-lg',
			demoMarketStore.loading && 'pointer-events-none opacity-70'
		)}
	>
		<button
			type="button"
			class="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			onclick={() => (open = !open)}
		>
			<span>Demo · Market</span>
			<span>{open ? '−' : '+'}</span>
		</button>

		{#if open}
			<div class="space-y-3 px-3 py-3">
				<div>
					<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
						Simulated day
					</p>
					<p class="mt-0.5 font-mono text-sm font-semibold text-primary">
						{formatDisplayDate(demoMarketStore.marketDate)}
					</p>
					<p class="text-xs text-muted-foreground">
						offset {demoMarketStore.dayOffset >= 0 ? '+' : ''}{demoMarketStore.dayOffset}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="border border-border bg-muted px-2 py-2 text-xs font-semibold hover:bg-muted/80"
						disabled={demoMarketStore.loading}
						onclick={() => demoMarketStore.retreatDay()}
					>
						−1 Tag
					</button>
					<button
						type="button"
						class="border border-border bg-muted px-2 py-2 text-xs font-semibold hover:bg-muted/80"
						disabled={demoMarketStore.loading}
						onclick={() => demoMarketStore.advanceDay()}
					>
						+1 Tag
					</button>
				</div>

				<button
					type="button"
					class="w-full border border-accent/40 bg-accent/10 px-2 py-2 text-xs font-semibold text-accent hover:bg-accent/20"
					disabled={demoMarketStore.loading}
					onclick={() => demoMarketStore.applyGbmTick()}
				>
					GBM-Tick (Preise)
				</button>

				<div class="space-y-2 border-t border-border pt-3">
					<label
						class="block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>
						Market crash
					</label>
					<div class="flex items-center gap-2">
						<input
							type="number"
							min="1"
							max="99"
							bind:value={crashPercent}
							disabled={demoMarketStore.loading}
							class="h-9 w-20 border border-input bg-background px-2 font-mono text-sm"
						/>
						<span class="text-xs text-muted-foreground">%</span>
						<button
							type="button"
							class="flex-1 border border-negative/40 bg-negative/10 px-2 py-2 text-xs font-semibold text-negative hover:bg-negative/20"
							disabled={demoMarketStore.loading || crashPercent <= 0 || crashPercent >= 100}
							onclick={() => demoMarketStore.applyMarketCrash(crashPercent)}
						>
							Crash
						</button>
					</div>
				</div>

				<p class="text-[10px] leading-relaxed text-muted-foreground">
					Gilt für alle Nutzer live (DB + Polling). +1 Tag: Handelstag + GBM. GBM-Tick: nur Preise.
					Crash: alle Aktien fallen um den gewählten Prozentsatz (STOCK_DEBUG).
				</p>

				{#if demoMarketStore.error}
					<p class="text-xs text-negative">{demoMarketStore.error}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}
