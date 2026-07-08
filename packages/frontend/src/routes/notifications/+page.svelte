<script lang="ts">
	import { AlertTriangle, Bell, Check, CheckCheck, Clock, TrendingUp } from '@lucide/svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import EmptyState from '$lib/components/app/EmptyState.svelte';
	import type { BackendNotification } from '$lib/api/backend-types';
	import { getNotifications } from '$lib/data/notifications.svelte';
	import { cn, formatCurrency, formatNumber } from '$lib/utils';

	type Notification = BackendNotification;

	const notifications = getNotifications();

	type NotificationCopy = { title: string; body: string };

	function fieldString(data: Record<string, unknown> | null, key: string): string | null {
		const value = data?.[key];
		return typeof value === 'string' ? value : null;
	}

	function fieldNumber(data: Record<string, unknown> | null, key: string): number | null {
		const value = data?.[key];
		return typeof value === 'number' ? value : null;
	}

	function describe(notification: Notification): NotificationCopy {
		const data = notification.data;
		const ticker = fieldString(data, 'ticker') ?? 'a stock';
		const quantity = fieldNumber(data, 'quantity');
		const side = fieldString(data, 'ruleType') === 'SELL' ? 'sell' : 'buy';
		const shares = quantity !== null ? `${formatNumber(quantity)} × ${ticker}` : ticker;

		switch (notification.type) {
			case 'AUTOTRADE_TRIGGERED': {
				const price = fieldNumber(data, 'executedPrice');
				const at = price !== null ? ` at ${formatCurrency(price)}` : '';
				return {
					title: 'Auto-trade executed',
					body: `Your rule to ${side} ${shares} triggered${at}.`
				};
			}
			case 'AUTOTRADE_EXPIRED': {
				const threshold = fieldNumber(data, 'priceThreshold');
				const at = threshold !== null ? ` at ${formatCurrency(threshold)}` : '';
				return {
					title: 'Auto-trade expired',
					body: `Your rule to ${side} ${shares}${at} expired without firing.`
				};
			}
			case 'AUTOTRADE_FAILED': {
				const reason =
					fieldString(data, 'reason') === 'INSUFFICIENT_HOLDINGS'
						? 'not enough holdings'
						: 'insufficient funds';
				return {
					title: 'Auto-trade could not execute',
					body: `Your rule to ${side} ${shares} matched but failed: ${reason}.`
				};
			}
		}
	}

	function iconFor(type: Notification['type']) {
		if (type === 'AUTOTRADE_TRIGGERED') return TrendingUp;
		if (type === 'AUTOTRADE_EXPIRED') return Clock;
		return AlertTriangle;
	}

	function accentClass(type: Notification['type']): string {
		if (type === 'AUTOTRADE_TRIGGERED') return 'border-positive/30 bg-positive/8 text-positive';
		if (type === 'AUTOTRADE_FAILED') return 'border-warning/30 bg-warning/8 text-warning';
		return 'border-border bg-muted text-muted-foreground';
	}

	function formatWhen(iso: string): string {
		const then = new Date(iso).getTime();
		const diff = Date.now() - then;
		const minute = 60_000;
		const hour = 60 * minute;
		const day = 24 * hour;
		if (diff < minute) return 'just now';
		if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
		if (diff < day) return `${Math.floor(diff / hour)}h ago`;
		if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
		return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader title="Notifications" subtitle="Auto-trade activity and account alerts" />
		<button
			type="button"
			onclick={notifications.markAll}
			disabled={!notifications.hasUnread || notifications.isMarkingAll}
			class="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
		>
			<CheckCheck class="size-3.5" />
			Mark all as read
		</button>
	</div>

	{#if notifications.isError}
		<p class="mb-4 border border-negative/30 bg-negative/8 px-4 py-3 text-sm text-negative">
			{notifications.error instanceof Error
				? notifications.error.message
				: 'Failed to load notifications'}
		</p>
	{/if}

	{#if notifications.items.length === 0}
		{#if notifications.isLoading}
			<div class="flex justify-center py-16">
				<div
					class="size-6 animate-spin border-2 border-muted-foreground/30 border-t-foreground"
					aria-label="Loading"
				></div>
			</div>
		{:else}
			<EmptyState
				title="No notifications yet"
				description="You'll be notified here when your auto-trade rules trigger, expire, or can't execute."
			>
				{#snippet icon()}
					<Bell class="mb-3 size-8 text-muted-foreground/50" />
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<div class="border border-border">
			{#each notifications.items as notification (notification.id)}
				{@const copy = describe(notification)}
				{@const Icon = iconFor(notification.type)}
				<div
					class={cn(
						'flex items-start gap-3 border-t border-border/60 px-4 py-3.5 transition-colors first:border-t-0',
						notification.read ? 'bg-transparent' : 'bg-accent/5'
					)}
				>
					<span
						class={cn(
							'flex size-8 shrink-0 items-center justify-center border',
							accentClass(notification.type)
						)}
					>
						<Icon class="size-4" />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="text-sm font-semibold text-foreground">{copy.title}</p>
							{#if !notification.read}
								<span class="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread"></span>
							{/if}
						</div>
						<p class="mt-0.5 text-sm text-muted-foreground">{copy.body}</p>
						<p class="mt-1 text-[11px] text-muted-foreground/70">
							{formatWhen(notification.createdAt)}
						</p>
					</div>
					{#if !notification.read}
						<button
							type="button"
							onclick={() => notifications.markRead(notification.id)}
							class="inline-flex shrink-0 items-center gap-1 border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							aria-label="Mark as read"
						>
							<Check class="size-3" />
							Read
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
