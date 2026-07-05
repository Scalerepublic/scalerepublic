<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import NobleButton from '$lib/components/app/NobleButton.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import CopyableSecret from '$lib/components/app/CopyableSecret.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import EmptyState from '$lib/components/app/EmptyState.svelte';
	import {
		assertDeveloperApiError,
		developerStore,
		type ApiKeyScope
	} from '$lib/stores/developer.svelte';
	import { cn } from '$lib/utils';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';

	let createOpen = $state(false);
	let revealOpen = $state(false);
	let rotateDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let rotateTargetId = $state<string | null>(null);
	let deleteTargetId = $state<string | null>(null);
	let revealedSecret = $state('');
	let revealedTitle = $state('New API key');

	let keyName = $state('');
	let readScope = $state(true);
	let tradeScope = $state(false);
	let expiresAt = $state('');
	let creating = $state(false);
	let rotating = $state(false);
	let deleting = $state(false);

	$effect(() => {
		if (!developerStore.loading && !developerStore.enabled) {
			void goto(resolve('/settings'), { replaceState: true });
		}
	});

	$effect(() => {
		if (!rotateDialogOpen) {
			rotateTargetId = null;
		}
	});

	$effect(() => {
		if (!deleteDialogOpen) {
			deleteTargetId = null;
		}
	});

	const selectedScopes = $derived(
		[readScope ? ('read' as const) : null, tradeScope ? ('trade' as const) : null].filter(
			(scope): scope is ApiKeyScope => scope !== null
		)
	);

	const canCreate = $derived(keyName.trim().length > 0 && selectedScopes.length > 0);

	$effect(() => {
		if (!createOpen) {
			keyName = '';
			readScope = true;
			tradeScope = false;
			expiresAt = '';
		}
	});

	function openRotateDialog(keyId: string) {
		rotateTargetId = keyId;
		rotateDialogOpen = true;
	}

	function openDeleteDialog(keyId: string) {
		deleteTargetId = keyId;
		deleteDialogOpen = true;
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		return new Date(value).toLocaleString();
	}

	function openReveal(secret: string, title: string) {
		revealedSecret = secret;
		revealedTitle = title;
		revealOpen = true;
	}

	async function handleCreate() {
		if (!canCreate || creating) return;
		creating = true;
		try {
			const created = await developerStore.createKey({
				name: keyName.trim(),
				scopes: selectedScopes,
				expiresAt: expiresAt.trim() ? new Date(expiresAt).toISOString() : undefined
			});
			createOpen = false;
			openReveal(created.secret, `Created: ${created.name}`);
			toast.success('API key created');
		} catch (error) {
			toast.error(assertDeveloperApiError(error));
		} finally {
			creating = false;
		}
	}

	async function handleRotate() {
		if (!rotateTargetId || rotating) return;
		rotating = true;
		try {
			const rotated = await developerStore.rotateKey(rotateTargetId);
			rotateDialogOpen = false;
			openReveal(rotated.secret, `Rotated: ${rotated.name}`);
			toast.success('API key rotated');
		} catch (error) {
			toast.error(assertDeveloperApiError(error));
		} finally {
			rotating = false;
		}
	}

	async function handleDelete() {
		if (!deleteTargetId || deleting) return;
		deleting = true;
		try {
			await developerStore.deleteKey(deleteTargetId);
			deleteDialogOpen = false;
			toast.success('API key deleted');
		} catch (error) {
			toast.error(assertDeveloperApiError(error));
		} finally {
			deleting = false;
		}
	}
</script>

<div class="page-shell">
	<div class="page-header-row">
		<PageHeader
			title="API Keys"
			subtitle="Manage scoped keys for the ScaleRepublic public trading API."
		/>
		<NobleButton onclick={() => (createOpen = true)}>Generate new key</NobleButton>
	</div>

	{#if developerStore.loading}
		<p class="text-sm text-muted-foreground">Loading keys…</p>
	{:else if developerStore.keys.length === 0}
		<EmptyState
			title="No API keys yet"
			description="Create a key with read and/or trade scopes to call the public API."
		>
			<NobleButton onclick={() => (createOpen = true)}>Generate new key</NobleButton>
		</EmptyState>
	{:else}
		<div class="overflow-x-auto border border-border bg-card">
			<table class="min-w-full text-left text-sm">
				<thead
					class="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase"
				>
					<tr>
						<th class="px-4 py-3 font-semibold">Name</th>
						<th class="px-4 py-3 font-semibold">Prefix</th>
						<th class="px-4 py-3 font-semibold">Scopes</th>
						<th class="px-4 py-3 font-semibold">Created</th>
						<th class="px-4 py-3 font-semibold">Last used</th>
						<th class="px-4 py-3 font-semibold">Expires</th>
						<th class="px-4 py-3 font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each developerStore.keys as key (key.id)}
						<tr>
							<td class="px-4 py-3 font-medium text-foreground">{key.name}</td>
							<td class="px-4 py-3 font-mono text-xs text-muted-foreground">{key.keyPrefix}…</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-1.5">
									{#each key.scopes as scope (scope)}
										<span
											class={cn(
												'inline-flex border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
												scope === 'trade'
													? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
													: 'border-primary/20 bg-primary/10 text-primary'
											)}
										>
											{scope}
										</span>
									{/each}
								</div>
							</td>
							<td class="px-4 py-3 text-muted-foreground">{formatDate(key.createdAt)}</td>
							<td class="px-4 py-3 text-muted-foreground">{formatDate(key.lastUsedAt)}</td>
							<td class="px-4 py-3 text-muted-foreground">{formatDate(key.expiresAt)}</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										class="text-xs font-semibold text-primary hover:underline"
										onclick={() => openRotateDialog(key.id)}
									>
										Rotate
									</button>
									<button
										type="button"
										class="text-xs font-semibold text-destructive hover:underline"
										onclick={() => openDeleteDialog(key.id)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if createOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<button
			type="button"
			class="absolute inset-0 bg-background/80 backdrop-blur-sm"
			aria-label="Close dialog"
			onclick={() => (createOpen = false)}
		></button>
		<div
			class="relative z-10 w-full max-w-md border border-border bg-card p-6 shadow-lg"
			role="dialog"
			aria-modal="true"
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			<h2 class="font-serif text-lg font-bold text-foreground">Generate API key</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Choose scopes carefully. Trade keys can buy and sell on your active portfolio.
			</p>

			<div class="mt-4 space-y-4">
				<FormField id="key-name" label="Name" bind:value={keyName} maxlength={60} />

				<fieldset class="space-y-2">
					<legend class="text-xs font-semibold tracking-wide text-foreground uppercase"
						>Scopes</legend
					>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={readScope} />
						<span>Read — list stocks and view portfolio</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={tradeScope} />
						<span>Trade — buy and sell on your portfolio</span>
					</label>
				</fieldset>

				<FormField
					id="key-expires"
					label="Expires at (optional)"
					type="datetime-local"
					bind:value={expiresAt}
				/>
			</div>

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
					onclick={() => (createOpen = false)}
				>
					Cancel
				</button>
				<NobleButton disabled={!canCreate || creating} onclick={handleCreate}>
					{creating ? 'Creating…' : 'Create key'}
				</NobleButton>
			</div>
		</div>
	</div>
{/if}

{#if revealOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<button
			type="button"
			class="absolute inset-0 bg-background/80 backdrop-blur-sm"
			aria-label="Close dialog"
			onclick={() => (revealOpen = false)}
		></button>
		<div
			class="relative z-10 w-full max-w-lg border border-border bg-card p-6 shadow-lg"
			role="dialog"
			aria-modal="true"
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			<h2 class="font-serif text-lg font-bold text-foreground">{revealedTitle}</h2>
			<CopyableSecret class="mt-4" value={revealedSecret} />
			<div class="mt-6 flex justify-end">
				<NobleButton onclick={() => (revealOpen = false)}>Done</NobleButton>
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={rotateDialogOpen}
	title="Rotate API key?"
	message="The current secret stops working immediately. Update any scripts using this key."
	confirmLabel="Rotate key"
	confirming={rotating}
	onConfirm={handleRotate}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete API key?"
	message="This key will stop working immediately and cannot be recovered."
	confirmLabel="Delete key"
	confirming={deleting}
	onConfirm={handleDelete}
/>
