<script lang="ts">
	import { Check, X } from '@lucide/svelte';

	let { password = '' } = $props<{ password?: string }>();

	const requirements = $derived([
		{
			id: 'length',
			label: 'At least 8 characters',
			satisfied: password.length >= 8
		},
		{
			id: 'lowercase',
			label: 'At least one lowercase letter (a-z)',
			satisfied: /[a-z]/.test(password)
		},
		{
			id: 'uppercase',
			label: 'At least one uppercase letter (A-Z)',
			satisfied: /[A-Z]/.test(password)
		},
		{
			id: 'number',
			label: 'At least one number (0-9)',
			satisfied: /[0-9]/.test(password)
		},
		{
			id: 'special',
			label: 'At least one special character',
			satisfied: /[^a-zA-Z0-9]/.test(password)
		}
	]);
</script>

<div class="space-y-2 rounded-sm border border-border/40 bg-muted/20 p-3.5 mt-2">
	<p class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Password requirements</p>
	<ul class="space-y-1.5">
		{#each requirements as req (req.id)}
			<li class="flex items-center gap-2 text-xs transition-colors">
				{#if req.satisfied}
					<Check class="size-3.5 text-positive shrink-0" />
					<span class="text-foreground/80 line-through decoration-positive/20">{req.label}</span>
				{:else}
					<X class="size-3.5 text-destructive shrink-0 opacity-60" />
					<span class="text-muted-foreground">{req.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
