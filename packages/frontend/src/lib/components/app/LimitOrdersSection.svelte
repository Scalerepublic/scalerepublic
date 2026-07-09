<script lang="ts">
	import ConfirmDialog from './ConfirmDialog.svelte';
	import InfoDialog from './InfoDialog.svelte';
	import { getLimitOrders } from '$lib/data/portfolio.svelte';
	import { cn, formatCurrency, formatNumber } from '$lib/utils';
	import type { ApiAutoTradeRule, AutoTradeStatus } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { AlertTriangle } from '@lucide/svelte';

	const limitOrders = getLimitOrders();
	const orders = $derived(limitOrders.orders);

	function orderTypeLabel(rule: ApiAutoTradeRule): string {
		if (rule.ruleType === 'BUY')
			return rule.triggerDirection === 'AT_OR_BELOW' ? 'Limit buy' : 'Stop buy';
		return rule.triggerDirection === 'AT_OR_ABOVE' ? 'Take-profit' : 'Stop-loss';
	}

	function conditionLabel(rule: ApiAutoTradeRule): string {
		const op = rule.triggerDirection === 'AT_OR_ABOVE' ? '≥' : '≤';
		return `${op} ${formatCurrency(parseFloat(rule.priceThreshold))}`;
	}

	function statusClass(status: AutoTradeStatus): string {
		if (status === 'ACTIVE') return 'border-accent/30 bg-accent/10 text-accent';
		if (status === 'TRIGGERED') return 'border-positive/30 bg-positive/8 text-positive';
		return 'border-border bg-muted text-muted-foreground';
	}

	function executeIssue(rule: ApiAutoTradeRule): string | null {
		if (rule.status !== 'ACTIVE') return null;
		const name = rule.ticker ?? 'this stock';
		if (rule.ruleType === 'BUY') {
			const cost = rule.quantity * parseFloat(rule.priceThreshold);
			const cash = limitOrders.cashBalance;
			if (cash < cost) {
				return `This order needs ${formatCurrency(cost)} to buy ${rule.quantity} × ${name} at the threshold, but only ${formatCurrency(cash)} is available. It won't execute until you have enough cash.`;
			}
		} else {
			const held = limitOrders.holdings.find((h) => h.stock.id === rule.stockId)?.shares ?? 0;
			if (held < rule.quantity) {
				return `This order sells ${rule.quantity} × ${name}, but you currently hold ${formatNumber(held)}. It won't execute until you hold enough shares.`;
			}
		}
		return null;
	}

	let cancelTarget = $state<ApiAutoTradeRule | null>(null);
	let cancelOpen = $state(false);

	let infoOpen = $state(false);
	let infoMessage = $state('');

	function askCancel(rule: ApiAutoTradeRule) {
		cancelTarget = rule;
		cancelOpen = true;
	}

	async function confirmCancel() {
		if (!cancelTarget) return;
		try {
			await limitOrders.cancel(cancelTarget.id);
			toast.success('Limit order cancelled');
			cancelOpen = false;
			cancelTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not cancel the order');
		}
	}

	function showIssue(message: string) {
		infoMessage = message;
		infoOpen = true;
	}
</script>

<div class="section-heading mt-10">
	<h2 class="font-serif text-lg font-bold text-foreground">Limit Orders</h2>
	{#if orders.length > 0}
		<span
			class="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{orders.length}
			{orders.length === 1 ? 'order' : 'orders'}
		</span>
	{/if}
</div>

{#if limitOrders.isError}
	<div
		class="mt-4 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
	>
		{limitOrders.error instanceof Error ? limitOrders.error.message : 'Could not load limit orders'}
	</div>
{:else if orders.length === 0}
	<div
		class="mt-4 rounded-xl border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground"
	>
		No limit orders yet — set one from a stock's detail view.
	</div>
{:else}
	<div class="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-b border-border">
					<th
						class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>
						Ticker
					</th>
					<th
						class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>
						Order
					</th>
					<th
						class="hidden px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase sm:table-cell"
					>
						Shares
					</th>
					<th
						class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>
						Status
					</th>
					<th
						class="px-4 py-2.5 text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
					>
						&nbsp;
					</th>
				</tr>
			</thead>
			<tbody>
				{#each orders as rule (rule.id)}
					{@const issue = executeIssue(rule)}
					<tr class="border-t border-border/60">
						<td class="px-4 py-3.5">
							<span class="font-mono text-sm font-bold text-primary">{rule.ticker ?? '—'}</span>
						</td>
						<td class="px-4 py-3.5">
							<span class="font-medium text-foreground">{orderTypeLabel(rule)}</span>
							<span class="ml-2 font-mono text-xs text-muted-foreground"
								>{conditionLabel(rule)}</span
							>
							<span class="mt-0.5 block text-[10px] text-muted-foreground sm:hidden">
								{formatNumber(rule.quantity)} shares
							</span>
						</td>
						<td class="hidden px-4 py-3.5 text-right font-mono sm:table-cell">
							{formatNumber(rule.quantity)}
						</td>
						<td class="px-4 py-3.5">
							<div class="flex items-center gap-1.5">
								<span
									class={cn(
										'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
										statusClass(rule.status)
									)}
								>
									{rule.status}
								</span>
								{#if issue}
									<button
										type="button"
										class="text-warning transition-colors hover:text-warning/80"
										aria-label="Why this order can't execute"
										title="Can't currently execute"
										onclick={() => showIssue(issue)}
									>
										<AlertTriangle class="size-4" />
									</button>
								{/if}
							</div>
						</td>
						<td class="px-4 py-3.5 text-right">
							{#if rule.status === 'ACTIVE'}
								<button
									type="button"
									class="rounded-md border border-input px-3 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									onclick={() => askCancel(rule)}
								>
									Cancel
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<ConfirmDialog
	bind:open={cancelOpen}
	title="Cancel limit order?"
	message={cancelTarget
		? `This will cancel your ${orderTypeLabel(cancelTarget).toLowerCase()} of ${cancelTarget.quantity} × ${cancelTarget.ticker ?? 'this stock'}. This can't be undone.`
		: ''}
	confirmLabel="Cancel order"
	cancelLabel="Keep order"
	confirming={limitOrders.isCancelling}
	onConfirm={confirmCancel}
/>

<InfoDialog bind:open={infoOpen} title="Order can't currently execute" message={infoMessage} />
