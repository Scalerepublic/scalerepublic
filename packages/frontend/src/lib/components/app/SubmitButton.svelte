<!--
  Purpose: Render a consistent pending-aware form submit control.
-->
<script lang="ts">
	import { Loader2 } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let {
		label,
		loadingLabel,
		loading = false,
		disabled = false,
		class: className
	}: {
		label: string;
		loadingLabel: string;
		loading?: boolean;
		disabled?: boolean;
		class?: string;
	} = $props();
</script>

<button
	type="submit"
	disabled={disabled || loading}
	class={cn(
		'btn-primary inline-flex h-10 items-center justify-center gap-2 text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50',
		className
	)}
>
	{#if loading}
		<Loader2 class="size-4 animate-spin" />
		{loadingLabel}
	{:else}
		{label}
	{/if}
</button>
