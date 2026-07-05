<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		heading,
		description,
		children,
		footer
	}: {
		/** Document title, rendered as "{title} · ScaleRepublic". */
		title: string;
		heading: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<svelte:head><title>{title} · ScaleRepublic</title></svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<p class="font-sans text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
				ScaleRepublic
			</p>
			<div class="mt-2 flex items-center justify-center gap-3">
				<div class="h-px flex-1 bg-border"></div>
				<span class="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase"
					>Exchange</span
				>
				<div class="h-px flex-1 bg-border"></div>
			</div>
		</div>

		<div class="border border-border bg-card p-7">
			<header class="mb-6 border-b border-border pb-5">
				<h1 class="font-serif text-2xl font-bold text-foreground">{heading}</h1>
				{#if description}
					<p class="mt-1 text-sm text-muted-foreground">{description}</p>
				{/if}
			</header>
			{@render children()}
		</div>

		{#if footer}
			<p class="mt-5 text-center text-sm text-muted-foreground">
				{@render footer()}
			</p>
		{/if}
	</div>
</div>
