<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { Sun, Moon, Monitor } from '@lucide/svelte';

	const themes: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	];
</script>

<section class="rounded-xl border border-border bg-card p-5">
	<p class="text-sm font-semibold text-foreground">Colour Scheme</p>
	<p class="mt-1 mb-5 text-sm text-muted-foreground">Choose your preferred visual theme.</p>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
		{#each themes as theme (theme.value)}
			{@const Icon = theme.icon}
			<button
				type="button"
				onclick={() => setMode(theme.value)}
				class="flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-semibold transition-all {userPrefersMode.current ===
				theme.value
					? 'border-primary bg-muted text-primary'
					: 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'}"
			>
				<Icon class="size-5" />
				{theme.label}
			</button>
		{/each}
	</div>
</section>
