<script lang="ts">
	import { resolve } from '$app/paths';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { assertDeveloperApiError, developerStore } from '$lib/stores/developer.svelte';
	import { Code2, ExternalLink } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let enabling = $state(false);

	async function handleEnable() {
		if (enabling || developerStore.enabled) return;
		enabling = true;
		try {
			await developerStore.enable();
			await developerStore.load();
			toast.success('Developer mode enabled.');
		} catch (error) {
			toast.error(assertDeveloperApiError(error));
		} finally {
			enabling = false;
		}
	}
</script>

<section class="overflow-hidden border border-border bg-card">
	<div class="border-b border-border px-5 py-4">
		<h2 class="font-serif text-base font-bold text-foreground">Developer</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Generate scoped API keys and integrate with the public trading API.
		</p>
	</div>

	<dl class="divide-y divide-border">
		<SettingsRow icon={Code2} label="Developer mode">
			{#if developerStore.enabled}
				<span class="text-sm font-semibold text-emerald-600">Enabled</span>
			{:else}
				<NobleButton variant="secondary" disabled={enabling} onclick={handleEnable}>
					{enabling ? 'Enabling…' : 'Enable'}
				</NobleButton>
			{/if}
		</SettingsRow>

		{#if developerStore.enabled}
			<SettingsRow icon={ExternalLink} label="API keys">
				<a
					href={resolve('/developer/api-keys')}
					class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
				>
					Manage keys
					<ExternalLink class="size-3.5" />
				</a>
			</SettingsRow>
		{/if}
	</dl>
</section>
