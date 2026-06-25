<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { cn } from '$lib/utils';

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		confirming = false,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirming?: boolean;
		onConfirm: () => void | Promise<void>;
	} = $props();

	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	});

	function close() {
		if (confirming) return;
		open = false;
	}

	function onBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onBackdropKeydown} />

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
			aria-labelledby="confirm-dialog-title"
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			<h2 id="confirm-dialog-title" class="font-serif text-lg font-bold text-foreground">
				{title}
			</h2>
			<p class="mt-2 text-sm text-muted-foreground">{message}</p>

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={close}
					disabled={confirming}
					class="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={() => void onConfirm()}
					disabled={confirming}
					class={cn(
						'border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
						'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
					)}
				>
					{confirming ? 'Working…' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
