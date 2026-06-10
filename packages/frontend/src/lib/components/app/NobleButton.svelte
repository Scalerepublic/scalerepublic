<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';

	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		href?: Parameters<typeof resolve>[0];
		class?: string;
		children?: import('svelte').Snippet;
	} & HTMLButtonAttributes;

	let { href, type = 'button', class: className = '', children, ...rest }: Props = $props();

	let classes = $derived(
		cn(
			'btn-primary inline-flex h-9 items-center justify-center px-4 text-sm font-semibold tracking-wide transition-colors',
			className
		)
	);
</script>

{#if href}
	<a href={resolve(href)} class={classes} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button {type} class={classes} {...rest}>
		{@render children?.()}
	</button>
{/if}
