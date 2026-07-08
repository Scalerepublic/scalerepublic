<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsRow from './SettingsRow.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import { performanceStore } from '$lib/stores/performance.svelte';
	import { leaderboardStore } from '$lib/stores/leaderboard.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { signOut } from '$lib/auth-client';
	import { ApiError } from '$lib/api';
	import { formatCurrency } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { Wallet, Shield, TrendingUp, Trophy, AlertTriangle } from '@lucide/svelte';

	let defaultDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let deletePassword = $state('');
	let forcingDefault = $state(false);
	let deletingAccount = $state(false);

	$effect(() => {
		if (!deleteDialogOpen) {
			deletePassword = '';
		}
	});

	const canForceDefault = $derived(
		userStore.profile.accountStatus === 'active' &&
			(userStore.profile.penaltyCounter ?? 0) < 3 &&
			portfolioStore.portfolioStatus === 'ACTIVE'
	);

	async function handleForceDefault() {
		if (forcingDefault) return;
		forcingDefault = true;
		try {
			const result = await portfolioStore.forceDefault();
			defaultDialogOpen = false;
			const userId = authStore.user?.id;
			await Promise.all([
				userStore.load(),
				userId ? performanceStore.load(userId) : Promise.resolve(),
				leaderboardStore.load({ silent: true })
			]);
			if (result.isSuspended) {
				toast.error('Portfolio defaulted. Your account is now suspended.');
			} else {
				toast.success('Portfolio defaulted. A fresh portfolio has been created.');
			}
		} catch (e) {
			const message =
				e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Force default failed';
			toast.error(message);
		} finally {
			forcingDefault = false;
		}
	}

	async function handleDeleteAccount() {
		if (deletingAccount || deletePassword.length === 0) return;
		deletingAccount = true;
		try {
			await userStore.deleteAccount(deletePassword);
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
		} finally {
			deletingAccount = false;
		}
	}
</script>

<section class="rounded-xl border border-border bg-card">
	<dl class="divide-y divide-border/60">
		{#if userStore.profile.startingCapital !== undefined}
			<SettingsRow icon={Wallet} label="Starting Capital">
				<span class="font-mono font-semibold text-foreground">
					{formatCurrency(userStore.profile.startingCapital)}
				</span>
			</SettingsRow>
		{/if}
		<SettingsRow icon={TrendingUp} label="Current Portfolio Value">
			<span class="font-mono font-semibold text-foreground">
				{formatCurrency(portfolioStore.summary.totalValue)}
			</span>
		</SettingsRow>
		<SettingsRow icon={Wallet} label="Cash Balance">
			<span class="font-mono font-semibold text-foreground">
				{formatCurrency(portfolioStore.summary.cashBalance)}
			</span>
		</SettingsRow>
		{#if userStore.profile.accountStatus !== undefined}
			<SettingsRow icon={Shield} label="Account Status">
				<span
					class="border px-2 py-0.5 text-xs font-semibold {userStore.profile.accountStatus ===
					'active'
						? 'border-positive/30 bg-positive/8 text-positive'
						: 'border-negative/30 bg-negative/8 text-negative'}"
				>
					{userStore.profile.accountStatus === 'active' ? 'Active' : 'Suspended'}
				</span>
			</SettingsRow>
		{/if}
		{#if userStore.profile.penaltyCounter !== undefined}
			<SettingsRow icon={Trophy} label="Defaults">
				<span class="flex items-center gap-3">
					<span class="font-mono font-semibold text-foreground">
						{userStore.profile.penaltyCounter} / 3
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
				disabled={!canForceDefault || forcingDefault || deletingAccount}
				class="shrink-0 border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
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
				disabled={deletingAccount || forcingDefault}
				class="shrink-0 border border-destructive/40 bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
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
	confirming={forcingDefault}
	onConfirm={handleForceDefault}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete your account?"
	message="This permanently deletes your account and all associated data, including your portfolio and trade history. You will be signed out immediately."
	confirmLabel="Yes, delete account"
	cancelLabel="Cancel"
	confirming={deletingAccount}
	confirmDisabled={deletePassword.length === 0}
	onConfirm={handleDeleteAccount}
>
	<FormField
		id="delete-account-password"
		label="Password"
		type="password"
		autocomplete="current-password"
		bind:value={deletePassword}
		disabled={deletingAccount}
	/>
</ConfirmDialog>
