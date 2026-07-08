<script lang="ts">
	import ChangeIndicator from './ChangeIndicator.svelte';
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		change,
		changePct,
		changeShowAmount = true,
		children
	}: {
		label: string;
		value: string;
		change?: number;
		changePct?: number;
		changeShowAmount?: boolean;
		children?: Snippet;
	} = $props();
</script>

<article class="relative flex-1 overflow-hidden rounded-xl border border-border bg-card p-5">
	<p class="text-sm text-muted-foreground">{label}</p>
	<p class="mt-2 text-3xl font-semibold tracking-tight text-primary tabular-nums">{value}</p>
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
