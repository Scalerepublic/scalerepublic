<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		icon,
		children
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		/** Optional action (e.g. a button) rendered below the text. */
		children?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-center rounded-xl border border-dashed border-input py-16 text-center"
>
	{#if icon}
		{@render icon()}
	{/if}
	<p class="font-serif text-base font-semibold text-muted-foreground">{title}</p>
	{#if description}
		<p class="mt-1 text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
