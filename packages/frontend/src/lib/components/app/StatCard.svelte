<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
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
</script>

<article
	class="relative flex-1 overflow-hidden rounded-xl border bg-card p-5 {accent
		? 'border-accent/30'
		: 'border-border'}"
>
	{#if accent}
		<div
			class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60"
		></div>
	{/if}
	<p class="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
	<p class="mt-2.5 font-serif text-2xl font-bold text-primary">{value}</p>
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
