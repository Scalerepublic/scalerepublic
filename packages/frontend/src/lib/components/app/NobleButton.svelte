<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';

	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		href?: Parameters<typeof resolve>[0];
		class?: string;
		variant?: 'primary' | 'secondary';
		children?: import('svelte').Snippet;
	} & HTMLButtonAttributes;

	let {
		href,
		type = 'button',
		class: className = '',
		variant = 'primary',
		children,
		...rest
	}: Props = $props();

	let classes = $derived(
		cn(
			variant === 'secondary' ? 'btn-secondary' : 'btn-primary',
			'inline-flex h-9 items-center justify-center px-4 text-sm font-semibold tracking-wide transition-colors',
			className
		)
	);
</script>

{#if href}
	<a href={resolve(href)} class={classes} {...rest as HTMLAnchorAttributes}>
		{@render children?.()}
	</a>
{:else}
	<button {type} class={classes} {...rest}>
		{@render children?.()}
	</button>
{/if}
