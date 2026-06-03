<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import BottomNav from './BottomNav.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-svh bg-background">
	<Sidebar />

	<main
		class={cn(
			'min-w-0 flex-1 pb-16 transition-[margin] duration-200 ease-out md:pb-0',
			sidebarStore.collapsed ? 'md:ml-16' : 'md:ml-64'
		)}
	>
		{@render children()}
	</main>

	<BottomNav />
</div>
