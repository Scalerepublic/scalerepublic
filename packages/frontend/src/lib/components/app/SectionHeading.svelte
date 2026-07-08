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
	<h2 class="font-serif text-lg font-bold text-foreground">{title}</h2>
	{#if badge}
		<span
			class="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
		>
			{badge}
		</span>
	{:else if children}
		{@render children()}
	{/if}
</div>
