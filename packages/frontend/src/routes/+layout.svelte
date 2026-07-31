<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/app/AppShell.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import AppToaster from '$lib/components/app/AppToaster.svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { signOut } from '$lib/auth-client';
	import { queryClient } from '$lib/api/query-client';
	import DemoDebugPanel from '$lib/components/app/DemoDebugPanel.svelte';
	import { isMarketDebugOperator } from '$lib/market-debug-operator';
	import { syncMarketClock } from '$lib/sync-market-clock';
	import { authStore } from '$lib/stores/auth.svelte';

	let { children } = $props();

	const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];
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
			queryClient.clear();
			void signOut();
			return;
		}

		if (!authStore.isAuthenticated && !isPublicRoute) {
			queryClient.clear();
			goto(resolve('/login'), { replaceState: true });
			return;
		}

		if (authStore.isAuthenticated && isPublicRoute) {
			goto(resolve('/dashboard'), { replaceState: true });
			return;
		}
	});

	$effect(() => {
		if (!authStore.isAuthenticated) {
			return;
		}

		void syncMarketClock();
	});
</script>

<ModeWatcher />
<AppToaster />

<QueryClientProvider client={queryClient}>
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
		{#if isMarketDebugOperator(authStore.user?.email)}
			<DemoDebugPanel />
		{/if}
	{:else}
		<div class="flex min-h-svh items-center justify-center bg-background">
			<div
				class="size-6 animate-spin border-2 border-muted-foreground/30 border-t-foreground"
				aria-label="Loading"
			></div>
		</div>
	{/if}
</QueryClientProvider>
