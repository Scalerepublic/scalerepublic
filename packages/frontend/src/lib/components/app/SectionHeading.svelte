<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		title,
		badge,
		class: className,
		children
	}: {
		title: string;
		/** Text rendered in a bordered badge on the right. */
		badge?: string;
		class?: string;
		/** Custom right-side content; ignored when `badge` is set. */
		children?: Snippet;
	} = $props();
</script>

<div class={cn('section-heading', className)}>
	<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
	{#if badge}
		<span
			class="border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{badge}
		</span>
	{:else if children}
		{@render children()}
	{/if}
</div>
