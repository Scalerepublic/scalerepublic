<script lang="ts">
	let {
		href,
		type = 'button',
		class: className = '',
		children,
		...rest
	}: {
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children?: import('svelte').Snippet;
	} = $props();
</script>

{#if href}
	<a
		{href}
		class={`inline-flex h-9 items-center justify-center rounded-[10px] border border-[oklch(0.64_0.045_78)] bg-gradient-to-br from-[oklch(0.93_0.03_84)] via-[oklch(0.89_0.03_81)] to-[oklch(0.85_0.03_78)] px-4 text-sm font-semibold tracking-wide text-[oklch(0.30_0.02_68)] shadow-[1px_2px_0_oklch(0.55_0.03_76/0.12),2px_4px_8px_oklch(0.55_0.03_76/0.10)] transition-all hover:brightness-[1.02] active:translate-y-px active:shadow-[0px_1px_0_oklch(0.55_0.03_76/0.12)] ${className}`}
		{...rest}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		{type}
		class={`inline-flex h-9 items-center justify-center rounded-[10px] border border-[oklch(0.64_0.045_78)] bg-gradient-to-br from-[oklch(0.93_0.03_84)] via-[oklch(0.89_0.03_81)] to-[oklch(0.85_0.03_78)] px-4 text-sm font-semibold tracking-wide text-[oklch(0.30_0.02_68)] shadow-[1px_2px_0_oklch(0.55_0.03_76/0.12),2px_4px_8px_oklch(0.55_0.03_76/0.10)] transition-all hover:brightness-[1.02] active:translate-y-px active:shadow-[0px_1px_0_oklch(0.55_0.03_76/0.12)] ${className}`}
		{...rest}
	>
		{@render children?.()}
	</button>
{/if}
