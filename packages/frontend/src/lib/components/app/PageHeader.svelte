<script lang="ts">
	let {
		title,
		subtitle
	}: {
		title: string;
		subtitle?: string;
	} = $props();
</script>

<div>
	<h1 class="font-serif text-2xl font-bold tracking-tight text-primary md:text-3xl">{title}</h1>
	{#if subtitle}
		<p class="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
	{/if}
</div>
