<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		change,
		changePct,
		accent = false,
		changeShowAmount = true,
		children
	}: {
		label: string;
		value: string;
		change?: number;
		changePct?: number;
		accent?: boolean;
		changeShowAmount?: boolean;
		children?: Snippet;
	} = $props();

	const changeTone = $derived(
		change === undefined ? 'neutral' : change >= 0 ? 'positive' : 'negative'
	);
</script>

<article
	class={cn(
		'relative flex-1 overflow-hidden border bg-card p-5',
		accent && changeTone === 'positive' && 'border-positive/40',
		accent && changeTone === 'negative' && 'border-negative/40',
		accent && changeTone === 'neutral' && 'border-accent/30',
		!accent && 'border-border'
	)}
>
	{#if accent}
		<div
			class={cn(
				'absolute inset-x-0 top-0 h-[3px]',
				changeTone === 'positive' && 'bg-positive',
				changeTone === 'negative' && 'bg-negative',
				changeTone === 'neutral' && 'bg-accent'
			)}
		></div>
	{/if}
	<p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
	<p class="mt-3 font-serif text-3xl font-bold text-primary">{value}</p>
	{#if change !== undefined && changePct !== undefined}
		<div class="mt-2">
			<ChangeIndicator
				amount={change}
				percent={changePct}
				size="sm"
				showAmount={changeShowAmount}
			/>
		</div>
	{/if}
	{#if children}
		<div class="mt-2">
			{@render children()}
		</div>
	{/if}
</article>
