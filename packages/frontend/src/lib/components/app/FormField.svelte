<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	let {
		id,
		label,
		value = $bindable(''),
		error = null,
		hint,
		labelEnd,
		...rest
	}: {
		id: string;
		label: string;
		value?: string;
		/** Validation message shown below the field; also marks the input invalid. */
		error?: string | null;
		/** Muted helper text shown while there is no error. */
		hint?: string;
		/** Rendered on the right side of the label row (e.g. a "Forgot password?" link). */
		labelEnd?: Snippet;
	} & Omit<HTMLInputAttributes, 'id' | 'value' | 'class'> = $props();
</script>

<div class="space-y-1.5">
	{#if labelEnd}
		<div class="flex items-center justify-between">
			<label for={id} class="text-xs font-semibold tracking-wide text-foreground uppercase"
				>{label}</label
			>
			{@render labelEnd()}
		</div>
	{:else}
		<label for={id} class="text-xs font-semibold tracking-wide text-foreground uppercase"
			>{label}</label
		>
	{/if}
	<input
		{id}
		bind:value
		aria-invalid={error !== null}
		class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
		{...rest}
	/>
	{#if error}
		<p class="text-xs font-medium text-destructive">{error}</p>
	{:else if hint}
		<p class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
