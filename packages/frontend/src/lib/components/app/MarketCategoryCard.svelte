<!--
  Purpose: Represent a browsable market sector.
-->
<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';

	let {
		label,
		description,
		count,
		accent = 'var(--accent)',
		onclick
	}: {
		label: string;
		description: string;
		count: number;
		accent?: string;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	class="market-category-card group relative flex h-full min-h-[10.5rem] w-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/35"
	style={`--sector-accent: ${accent}`}
	{onclick}
>
	<span
		class="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-xl bg-[var(--sector-accent)] transition-[width] duration-200 group-hover:w-1.5"
		aria-hidden="true"
	></span>
	<div class="flex flex-1 flex-col pl-2">
		<p
			class="line-clamp-2 min-h-[3.25rem] font-serif text-xl font-semibold tracking-tight text-foreground"
		>
			{label}
		</p>
		<p class="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
			{description}
		</p>
	</div>

	<div class="mt-4 flex items-end justify-between gap-3">
		<p class="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
			{count.toLocaleString()} listed
		</p>
		<span
			class="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition group-hover:border-accent group-hover:text-accent"
		>
			<ArrowUpRight class="size-4" />
		</span>
	</div>
</button>
