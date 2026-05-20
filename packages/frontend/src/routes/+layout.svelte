<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/app/AppShell.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	let { children } = $props();

	const PUBLIC_ROUTES = ['/login', '/signup'];
	const isPublicRoute = $derived(PUBLIC_ROUTES.includes(page.url.pathname));

	$effect(() => {
		if (authStore.isPending) return;

		if (!authStore.isAuthenticated && !isPublicRoute) {
			goto(resolve('/login'), { replaceState: true });
		} else if (authStore.isAuthenticated && isPublicRoute) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if authStore.isPending}
	<div class="flex min-h-svh items-center justify-center bg-background">
		<div
			class="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
			aria-label="Loading"
		></div>
	</div>
{:else if isPublicRoute}
	{@render children()}
{:else if authStore.isAuthenticated}
	<AppShell>{@render children()}</AppShell>
{/if}
