<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';

	const items = [
		{
			key: 'priceAlerts' as const,
			label: 'Price Alerts',
			description: 'Notify when a stock hits your threshold'
		},
		{
			key: 'tradeConfirmations' as const,
			label: 'Trade Confirmations',
			description: 'Confirm every buy and sell order'
		},
		{
			key: 'weeklyReport' as const,
			label: 'Weekly Report',
			description: 'Portfolio summary every Monday'
		}
	];
</script>

<section class="border border-border bg-card">
	<div class="divide-y divide-border/60">
		{#each items as item (item.key)}
			{@const enabled = userStore.settings.notifications[item.key]}
			<div class="flex items-center justify-between gap-4 px-5 py-4">
				<div>
					<p class="text-sm font-semibold text-foreground">{item.label}</p>
					<p class="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-label={item.label}
					aria-checked={enabled}
					onclick={() => userStore.updateNotifications({ [item.key]: !enabled })}
					class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {enabled
						? 'bg-primary'
						: 'border border-border bg-muted'}"
				>
					<span
						class="pointer-events-none inline-block size-4 bg-background ring-0 transition-transform {enabled
							? 'translate-x-4'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
		{/each}
	</div>
</section>
