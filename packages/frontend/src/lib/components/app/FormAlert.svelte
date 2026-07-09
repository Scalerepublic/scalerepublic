<script lang="ts">
	let { message }: { message: string | null } = $props();
</script>

{#if message}
	<div
		role="alert"
		class="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive"
	>
		{message}
	</div>
{/if}
