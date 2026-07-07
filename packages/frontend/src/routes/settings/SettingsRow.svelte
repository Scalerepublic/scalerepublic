<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	let {
		icon: Icon,
		label,
		children
	}: {
		icon: Component<{ class?: string }>;
		label: string;
		children: Snippet;
	} = $props();
</script>

<div class="flex items-center justify-between px-5 py-3.5">
	<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
		<Icon class="size-4 shrink-0" />
		{label}
	</dt>
	<dd>{@render children()}</dd>
</div>
