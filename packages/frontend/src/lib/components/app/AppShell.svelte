<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import BottomNav from './BottomNav.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
</script>

<div class="flex min-h-svh bg-background">
	<div
		class="pointer-events-none fixed inset-0 z-[9999] mix-blend-multiply"
		style="background-image: {grainSvg}; background-size: 256px 256px; opacity: 0.028;"
		aria-hidden="true"
	></div>

	<Sidebar />

	<main class="min-w-0 flex-1 pb-16 md:ml-64 md:pb-0">
		{@render children()}
	</main>

	<BottomNav />
</div>
