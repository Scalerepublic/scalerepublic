<!--
  Purpose: Redirect the root URL to authentication or the dashboard.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/auth.svelte';

	$effect(() => {
		if (authStore.isPending) return;
		if (authStore.isAuthenticated) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});
</script>
