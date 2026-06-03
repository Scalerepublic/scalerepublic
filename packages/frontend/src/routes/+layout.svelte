<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/app/AppShell.svelte';
	import { signOut } from '$lib/auth-client';
	import { bootstrapAppData, resetAppDataBootstrap } from '$lib/bootstrap-app-data';
	import { startLiveQuotesPolling } from '$lib/live-quotes-polling';
	import { authStore } from '$lib/stores/auth.svelte';

	let { children } = $props();

	const PUBLIC_ROUTES = ['/login', '/signup'];
	const isPublicRoute = $derived(PUBLIC_ROUTES.includes(page.url.pathname));

	let authTimedOut = $state(false);

	$effect(() => {
		if (!authStore.isPending) {
			authTimedOut = false;
			return;
		}

		const timer = setTimeout(() => {
			authTimedOut = true;
		}, 8_000);

		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (authStore.isPending && !authTimedOut) {
			return;
		}

		if (authStore.error) {
			resetAppDataBootstrap();
			void signOut();
			return;
		}

		if (!authStore.isAuthenticated && !isPublicRoute) {
			resetAppDataBootstrap();
			goto(resolve('/login'), { replaceState: true });
			return;
		}

		if (authStore.isAuthenticated && isPublicRoute) {
			goto(resolve('/dashboard'), { replaceState: true });
			return;
		}

		if (authStore.isAuthenticated) {
			bootstrapAppData();
		}
	});

	$effect(() => {
		if (!authStore.isAuthenticated) {
			return;
		}

		return startLiveQuotesPolling();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if isPublicRoute}
	{@render children()}
{:else if authStore.isPending && !authTimedOut}
	<div class="flex min-h-svh items-center justify-center bg-background">
		<div
			class="size-6 animate-spin border-2 border-muted-foreground/30 border-t-foreground"
			aria-label="Loading"
		></div>
	</div>
{:else if authStore.isAuthenticated}
	<AppShell>{@render children()}</AppShell>
{:else}
	<div class="flex min-h-svh items-center justify-center bg-background">
		<div
			class="size-6 animate-spin border-2 border-muted-foreground/30 border-t-foreground"
			aria-label="Loading"
		></div>
	</div>
{/if}
