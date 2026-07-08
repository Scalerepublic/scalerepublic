<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		open = $bindable(false),
		title,
		message
	}: {
		open?: boolean;
		title: string;
		message: string;
	} = $props();

	$effect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
	});

	function close() {
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<button
			type="button"
			class="absolute inset-0 bg-background/80 backdrop-blur-sm"
			aria-label="Close dialog"
			onclick={close}
		></button>

		<div
			class="relative z-10 w-full max-w-md border border-border bg-card p-6 shadow-lg"
			role="dialog"
			aria-modal="true"
			aria-labelledby="info-dialog-title"
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			<h2 id="info-dialog-title" class="font-serif text-lg font-bold text-foreground">
				{title}
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>

			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={close}
					class="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
				>
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}
