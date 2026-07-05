<script lang="ts">
	import { Copy, Eye, EyeOff } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';

	let {
		value,
		label = 'Secret key',
		class: className = ''
	}: {
		value: string;
		label?: string;
		class?: string;
	} = $props();

	let revealed = $state(false);
	let copying = $state(false);

	const displayValue = $derived(revealed ? value : '•'.repeat(Math.min(value.length, 32)));

	async function copySecret() {
		if (copying) return;
		copying = true;
		try {
			await navigator.clipboard.writeText(value);
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Could not copy to clipboard');
		} finally {
			copying = false;
		}
	}
</script>

<div class={cn('space-y-3', className)}>
	<p class="text-xs font-semibold tracking-wide text-foreground uppercase">{label}</p>
	<div class="flex items-center gap-2 border border-border bg-muted/40 px-3 py-2">
		<code class="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{displayValue}</code>
		<button
			type="button"
			class="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
			aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
			onclick={() => (revealed = !revealed)}
		>
			{#if revealed}
				<EyeOff class="size-4" />
			{:else}
				<Eye class="size-4" />
			{/if}
		</button>
		<button
			type="button"
			class="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
			aria-label="Copy secret"
			disabled={copying}
			onclick={() => void copySecret()}
		>
			<Copy class="size-4" />
		</button>
	</div>
	<p class="text-xs text-destructive">
		This secret is shown only once. Store it securely — you will not be able to view it again.
	</p>
</div>
