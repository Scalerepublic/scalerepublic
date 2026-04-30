<script lang="ts">
	let {
		title,
		subtitle,
	}: {
		title: string;
		subtitle?: string;
	} = $props();
</script>

<div class="mb-8">
	<h1 class="font-serif text-3xl font-bold tracking-tight text-primary md:text-4xl">{title}</h1>
	{#if subtitle}
		<p class="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
	{/if}
</div>
