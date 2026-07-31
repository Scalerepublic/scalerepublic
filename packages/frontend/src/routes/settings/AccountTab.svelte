<!--
  Purpose: Handle email changes and confirmed account deletion.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsRow from './SettingsRow.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { deleteAccount, forceDefault } from '$lib/api/queries';
	import { getPortfolio } from '$lib/data/portfolio.svelte';
	import { getUserProfile } from '$lib/data/user.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { signOut } from '$lib/auth-client';
	import { ApiError } from '$lib/api';
	import { formatCurrency } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { Wallet, Shield, TrendingUp, Trophy, AlertTriangle } from '@lucide/svelte';

	const account = getUserProfile();
	const portfolio = getPortfolio();

	const forceDefaultMutation = createMutation(() => ({ mutationFn: forceDefault }));
	const deleteAccountMutation = createMutation(() => ({
		mutationFn: (password: string) => deleteAccount(password, authStore.user?.id ?? '')
	}));

	let defaultDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let deletePassword = $state('');

	$effect(() => {
		if (!deleteDialogOpen) {
			deletePassword = '';
		}
	});

	const canForceDefault = $derived(
		account.profile.accountStatus === 'active' &&
			(account.profile.penaltyCounter ?? 0) < 3 &&
			(portfolio.status ?? null) === 'ACTIVE'
	);

	async function handleForceDefault() {
		if (forceDefaultMutation.isPending) return;
		try {
			const result = await forceDefaultMutation.mutateAsync();
			defaultDialogOpen = false;
			if (result.isSuspended) {
				toast.error('Portfolio defaulted. Your account is now suspended.');
			} else {
				toast.success('Portfolio defaulted. A fresh portfolio has been created.');
			}
		} catch (e) {
			const message =
				e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Force default failed';
			toast.error(message);
		}
	}

	async function handleDeleteAccount() {
		if (deleteAccountMutation.isPending || deletePassword.length === 0) return;
		try {
			await deleteAccountMutation.mutateAsync(deletePassword);
			deleteDialogOpen = false;
			await signOut().catch(() => undefined);
			toast.success('Your account has been deleted.');
			await goto(resolve('/login'), { replaceState: true, invalidateAll: true });
		} catch (e) {
			const message =
				e instanceof ApiError
					? e.message
					: e instanceof Error
						? e.message
						: 'Account deletion failed';
			toast.error(message);
		}
	}
</script>

<section class="rounded-xl border border-border bg-card">
	<dl class="divide-y divide-border/60">
		{#if account.profile.startingCapital !== undefined}
			<SettingsRow icon={Wallet} label="Starting Capital">
				<span class="font-mono font-semibold text-foreground">
					{formatCurrency(account.profile.startingCapital)}
				</span>
			</SettingsRow>
		{/if}
		<SettingsRow icon={TrendingUp} label="Current Portfolio Value">
			<span class="font-mono font-semibold text-foreground">
				{formatCurrency(portfolio.summary.totalValue)}
			</span>
		</SettingsRow>
		<SettingsRow icon={Wallet} label="Cash Balance">
			<span class="font-mono font-semibold text-foreground">
				{formatCurrency(portfolio.summary.cashBalance)}
			</span>
		</SettingsRow>
		{#if account.profile.accountStatus !== undefined}
			<SettingsRow icon={Shield} label="Account Status">
				<span
					class="border px-2 py-0.5 text-xs font-semibold {account.profile.accountStatus ===
					'active'
						? 'border-positive/30 bg-positive/8 text-positive'
						: 'border-negative/30 bg-negative/8 text-negative'}"
				>
					{account.profile.accountStatus === 'active' ? 'Active' : 'Suspended'}
				</span>
			</SettingsRow>
		{/if}
		{#if account.profile.penaltyCounter !== undefined}
			<SettingsRow icon={Trophy} label="Defaults">
				<span class="flex items-center gap-3">
					<span class="font-mono font-semibold text-foreground">
						{account.profile.penaltyCounter} / 3
					</span>
					<a
						href={resolve('/leaderboard')}
						class="text-xs font-medium text-primary hover:underline"
					>
						Leaderboard
					</a>
				</span>
			</SettingsRow>
		{/if}
	</dl>
</section>

<section class="mt-5 rounded-xl border border-destructive/30 bg-card">
	<div class="border-b border-destructive/20 px-5 py-4">
		<div class="flex items-center gap-2">
			<AlertTriangle class="size-4 text-destructive" />
			<h2 class="text-sm font-semibold text-foreground">Danger Zone</h2>
		</div>
		<p class="mt-1 text-xs text-muted-foreground">
			Irreversible actions for your account and portfolio.
		</p>
	</div>
	<div class="divide-y divide-destructive/20">
		<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="text-sm font-medium text-foreground">Force portfolio default</p>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Closes your current portfolio and starts a new one with $1,000 unless you are suspended.
				</p>
			</div>
			<button
				type="button"
				onclick={() => (defaultDialogOpen = true)}
				disabled={!canForceDefault ||
					forceDefaultMutation.isPending ||
					deleteAccountMutation.isPending}
				class="shrink-0 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Force default
			</button>
		</div>
		<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="text-sm font-medium text-foreground">Delete account</p>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Permanently removes your account, portfolio, trades, and session. This cannot be undone.
				</p>
			</div>
			<button
				type="button"
				onclick={() => (deleteDialogOpen = true)}
				disabled={deleteAccountMutation.isPending || forceDefaultMutation.isPending}
				class="shrink-0 rounded-lg border border-destructive/40 bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Delete account
			</button>
		</div>
	</div>
</section>

<ConfirmDialog
	bind:open={defaultDialogOpen}
	title="Force portfolio default?"
	message="Are you sure? Your active portfolio will be marked as defaulted. You will receive a fresh $1,000 portfolio unless this is your third default."
	confirmLabel="Yes, force default"
	cancelLabel="Cancel"
	confirming={forceDefaultMutation.isPending}
	onConfirm={handleForceDefault}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete your account?"
	message="This permanently deletes your account and all associated data, including your portfolio and trade history. You will be signed out immediately."
	confirmLabel="Yes, delete account"
	cancelLabel="Cancel"
	confirming={deleteAccountMutation.isPending}
	confirmDisabled={deletePassword.length === 0}
	onConfirm={handleDeleteAccount}
>
	<FormField
		id="delete-account-password"
		label="Password"
		type="password"
		autocomplete="current-password"
		bind:value={deletePassword}
		disabled={deleteAccountMutation.isPending}
	/>
</ConfirmDialog>
