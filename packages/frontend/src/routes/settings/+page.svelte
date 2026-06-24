<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userStore } from '$lib/stores/user.svelte';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import { performanceStore } from '$lib/stores/performance.svelte';
	import { leaderboardStore } from '$lib/stores/leaderboard.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { ApiError } from '$lib/api';
	import { signOut, changePassword, changeEmail } from '$lib/auth-client';
	import { api, parseApiData } from '$lib/api/client';
	import { emailSchema, passwordSchema } from 'backend/validation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { cn, formatCurrency, getInitials } from '$lib/utils';
	import {
		Mail,
		Sun,
		Moon,
		Monitor,
		User,
		Wallet,
		Shield,
		TrendingUp,
		LogOut,
		Trophy,
		AlertTriangle,
		Loader2,
		KeyRound,
		AtSign
	} from '@lucide/svelte';

	let isSigningOut = $state(false);
	let defaultDialogOpen = $state(false);
	let forcingDefault = $state(false);

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

	const inputClass =
		'h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50';
	const labelClass = 'text-xs font-semibold tracking-wide text-foreground uppercase';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let isChangingPassword = $state(false);
	let passwordError = $state<string | null>(null);

	const newPasswordIssue = $derived(
		newPassword.length === 0
			? null
			: (passwordSchema.safeParse(newPassword).error?.issues[0]?.message ?? null)
	);
	const canChangePassword = $derived(
		currentPassword.length > 0 &&
			passwordSchema.safeParse(newPassword).success &&
			newPassword === confirmNewPassword &&
			newPassword !== currentPassword
	);

	async function handleChangePassword(event: SubmitEvent) {
		event.preventDefault();
		if (isChangingPassword || !canChangePassword) return;

		passwordError = null;
		isChangingPassword = true;

		const { error } = await changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});

		if (error) {
			passwordError = error.message ?? 'Could not change your password. Please try again.';
			toast.error(passwordError);
			isChangingPassword = false;
			return;
		}

		currentPassword = '';
		newPassword = '';
		confirmNewPassword = '';
		isChangingPassword = false;
		toast.success('Password updated.');
	}

	let newEmail = $state('');
	let isChangingEmail = $state(false);
	let emailError = $state<string | null>(null);

	const newEmailIssue = $derived(
		newEmail.trim().length === 0
			? null
			: (emailSchema.safeParse(newEmail.trim()).error?.issues[0]?.message ?? null)
	);
	const canChangeEmail = $derived(
		emailSchema.safeParse(newEmail.trim()).success &&
			newEmail.trim().toLowerCase() !== userStore.profile.email.toLowerCase()
	);

	async function handleChangeEmail(event: SubmitEvent) {
		event.preventDefault();
		if (isChangingEmail || !canChangeEmail) return;

		emailError = null;
		isChangingEmail = true;

		const trimmedEmail = newEmail.trim();

		// better-auth reports success even when the email is already taken, so we
		// check availability ourselves first to give meaningful feedback.
		try {
			const res = await api.api.v1.auth['email-available'].$get({
				query: { email: trimmedEmail }
			});
			const { available } = await parseApiData<{ available: boolean }>(res);
			if (!available) {
				emailError = 'That email address is already in use.';
				toast.error(emailError);
				isChangingEmail = false;
				return;
			}
		} catch {
			emailError = 'Could not verify that email. Please try again.';
			toast.error(emailError);
			isChangingEmail = false;
			return;
		}

		const { error } = await changeEmail({ newEmail: trimmedEmail });

		if (error) {
			emailError = error.message ?? 'Could not change your email. Please try again.';
			toast.error(emailError);
			isChangingEmail = false;
			return;
		}

		newEmail = '';
		isChangingEmail = false;
		toast.success('Email updated.');
	}

	async function handleSignOut() {
		if (isSigningOut) return;
		isSigningOut = true;
		try {
			await signOut();
			await goto(resolve('/login'), { replaceState: true, invalidateAll: true });
		} catch {
			toast.error('Sign out failed. Please try again.');
			isSigningOut = false;
		}
	}

	const themes: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	];

	const joinDate = new Date(userStore.profile.joinedAt).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	let activeTab = $state<'profile' | 'account' | 'security' | 'appearance' | 'notifications'>(
		'profile'
	);

	const tabs = [
		{ id: 'profile' as const, label: 'Profile' },
		{ id: 'account' as const, label: 'Account' },
		{ id: 'security' as const, label: 'Security' },
		{ id: 'appearance' as const, label: 'Appearance' },
		{ id: 'notifications' as const, label: 'Notifications' }
	];
</script>

<div class="page-shell-narrow">
	<div class="page-header-block">
		<PageHeader title="Settings" />
	</div>

	<div class="mb-6 flex border-b border-border">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				onclick={() => (activeTab = tab.id)}
				class={cn(
					'px-4 py-2.5 text-sm font-medium transition-colors',
					activeTab === tab.id
						? '-mb-px border-b-2 border-primary text-primary'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'profile'}
		<section class="border border-border bg-card">
			<div class="p-5">
				<div class="flex items-center gap-4">
					<div
						class="flex size-14 shrink-0 items-center justify-center border border-border bg-muted text-lg font-bold text-foreground"
					>
						{getInitials(userStore.profile.name)}
					</div>
					<div>
						<p class="font-serif text-lg font-bold text-primary">{userStore.profile.name}</p>
						<p class="text-sm text-muted-foreground">{userStore.profile.email}</p>
					</div>
				</div>
			</div>

			<div class="h-px bg-border"></div>

			<dl class="divide-y divide-border/60">
				<div class="flex items-center justify-between px-5 py-3.5">
					<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
						<User class="size-4 shrink-0" /> Display Name
					</dt>
					<dd class="text-sm font-medium text-foreground">{userStore.profile.name}</dd>
				</div>
				<div class="flex items-center justify-between px-5 py-3.5">
					<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
						<Mail class="size-4 shrink-0" /> Email
					</dt>
					<dd class="text-sm font-medium text-foreground">{userStore.profile.email}</dd>
				</div>
				<div class="flex items-center justify-between px-5 py-3.5">
					<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
						<Shield class="size-4 shrink-0" /> Member since
					</dt>
					<dd class="text-sm font-medium text-foreground">{joinDate}</dd>
				</div>
			</dl>
		</section>

		<section class="mt-5 md:hidden">
			<button
				type="button"
				onclick={handleSignOut}
				disabled={isSigningOut}
				class="flex w-full items-center justify-center gap-2 border border-destructive/30 bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-50"
			>
				<LogOut class="size-4" />
				{isSigningOut ? 'Signing out…' : 'Sign out'}
			</button>
		</section>
	{/if}

	{#if activeTab === 'account'}
		<section class="border border-border bg-card">
			<dl class="divide-y divide-border/60">
				{#if userStore.profile.startingCapital !== undefined}
					<div class="flex items-center justify-between px-5 py-3.5">
						<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
							<Wallet class="size-4 shrink-0" /> Starting Capital
						</dt>
						<dd class="font-mono font-semibold text-foreground">
							{formatCurrency(userStore.profile.startingCapital)}
						</dd>
					</div>
				{/if}
				<div class="flex items-center justify-between px-5 py-3.5">
					<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
						<TrendingUp class="size-4 shrink-0" /> Current Portfolio Value
					</dt>
					<dd class="font-mono font-semibold text-foreground">
						{formatCurrency(portfolioStore.summary.totalValue)}
					</dd>
				</div>
				<div class="flex items-center justify-between px-5 py-3.5">
					<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
						<Wallet class="size-4 shrink-0" /> Cash Balance
					</dt>
					<dd class="font-mono font-semibold text-foreground">
						{formatCurrency(portfolioStore.summary.cashBalance)}
					</dd>
				</div>
				{#if userStore.profile.accountStatus !== undefined}
					<div class="flex items-center justify-between px-5 py-3.5">
						<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
							<Shield class="size-4 shrink-0" /> Account Status
						</dt>
						<dd>
							<span
								class="border px-2 py-0.5 text-xs font-semibold {userStore.profile.accountStatus ===
								'active'
									? 'border-positive/30 bg-positive/8 text-positive'
									: 'border-negative/30 bg-negative/8 text-negative'}"
							>
								{userStore.profile.accountStatus === 'active' ? 'Active' : 'Suspended'}
							</span>
						</dd>
					</div>
				{/if}
				{#if userStore.profile.penaltyCounter !== undefined}
					<div class="flex items-center justify-between px-5 py-3.5">
						<dt class="flex items-center gap-2.5 text-sm text-muted-foreground">
							<Trophy class="size-4 shrink-0" /> Defaults
						</dt>
						<dd class="flex items-center gap-3">
							<span class="font-mono font-semibold text-foreground">
								{userStore.profile.penaltyCounter} / 3
							</span>
							<a
								href={resolve('/leaderboard')}
								class="text-xs font-medium text-primary hover:underline"
							>
								Leaderboard
							</a>
						</dd>
					</div>
				{/if}
			</dl>
		</section>

		<section class="mt-5 border border-destructive/30 bg-card">
			<div class="border-b border-destructive/20 px-5 py-4">
				<div class="flex items-center gap-2">
					<AlertTriangle class="size-4 text-destructive" />
					<h2 class="text-sm font-semibold text-foreground">Danger Zone</h2>
				</div>
				<p class="mt-1 text-xs text-muted-foreground">
					Force-default your active portfolio. This counts as one strike toward suspension.
				</p>
			</div>
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
					disabled={!canForceDefault || forcingDefault}
					class="shrink-0 border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Force default
				</button>
			</div>
		</section>
	{/if}

	{#if activeTab === 'security'}
		<div class="space-y-5">
			<section class="border border-border bg-card">
				<header class="flex items-center gap-2.5 border-b border-border px-5 py-4">
					<KeyRound class="size-4 shrink-0 text-muted-foreground" />
					<div>
						<p class="text-sm font-semibold text-foreground">Change password</p>
						<p class="text-xs text-muted-foreground">
							Enter your current password and choose a new one.
						</p>
					</div>
				</header>
				<form class="space-y-4 p-5" onsubmit={handleChangePassword} novalidate>
					<div class="space-y-1.5">
						<label for="current-password" class={labelClass}>Current password</label>
						<input
							id="current-password"
							type="password"
							autocomplete="current-password"
							required
							bind:value={currentPassword}
							disabled={isChangingPassword}
							placeholder="••••••••"
							class={inputClass}
						/>
					</div>
					<div class="space-y-1.5">
						<label for="new-password" class={labelClass}>New password</label>
						<input
							id="new-password"
							type="password"
							autocomplete="new-password"
							required
							minlength={8}
							bind:value={newPassword}
							disabled={isChangingPassword}
							placeholder="At least 8 characters"
							class={inputClass}
						/>
						{#if newPasswordIssue}
							<p class="text-xs font-medium text-destructive">{newPasswordIssue}</p>
						{:else}
							<p class="text-xs text-muted-foreground">Must be at least 8 characters.</p>
						{/if}
					</div>
					<div class="space-y-1.5">
						<label for="confirm-new-password" class={labelClass}>Confirm new password</label>
						<input
							id="confirm-new-password"
							type="password"
							autocomplete="new-password"
							required
							bind:value={confirmNewPassword}
							disabled={isChangingPassword}
							placeholder="••••••••"
							class={inputClass}
						/>
					</div>

					{#if newPassword.length > 0 && confirmNewPassword.length > 0 && newPassword !== confirmNewPassword}
						<p class="text-xs font-medium text-destructive">Passwords do not match.</p>
					{/if}

					{#if passwordError}
						<div
							role="alert"
							class="border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive"
						>
							{passwordError}
						</div>
					{/if}

					<button
						type="submit"
						disabled={isChangingPassword || !canChangePassword}
						class="btn-primary inline-flex h-10 items-center justify-center gap-2 px-5 text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50"
					>
						{#if isChangingPassword}
							<Loader2 class="size-4 animate-spin" />
							Updating…
						{:else}
							Update password
						{/if}
					</button>
				</form>
			</section>

			<section class="border border-border bg-card">
				<header class="flex items-center gap-2.5 border-b border-border px-5 py-4">
					<AtSign class="size-4 shrink-0 text-muted-foreground" />
					<div>
						<p class="text-sm font-semibold text-foreground">Change email</p>
						<p class="text-xs text-muted-foreground">
							Current: <span class="font-medium text-foreground">{userStore.profile.email}</span>
						</p>
					</div>
				</header>
				<form class="space-y-4 p-5" onsubmit={handleChangeEmail} novalidate>
					<div class="space-y-1.5">
						<label for="new-email" class={labelClass}>New email</label>
						<input
							id="new-email"
							type="email"
							autocomplete="email"
							required
							bind:value={newEmail}
							disabled={isChangingEmail}
							aria-invalid={newEmailIssue !== null}
							placeholder="you@example.com"
							class="{inputClass} aria-invalid:border-destructive"
						/>
						{#if newEmailIssue}
							<p class="text-xs font-medium text-destructive">{newEmailIssue}</p>
						{/if}
					</div>

					{#if emailError}
						<div
							role="alert"
							class="border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive"
						>
							{emailError}
						</div>
					{/if}

					<button
						type="submit"
						disabled={isChangingEmail || !canChangeEmail}
						class="btn-primary inline-flex h-10 items-center justify-center gap-2 px-5 text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50"
					>
						{#if isChangingEmail}
							<Loader2 class="size-4 animate-spin" />
							Updating…
						{:else}
							Update email
						{/if}
					</button>
				</form>
			</section>
		</div>
	{/if}

	{#if activeTab === 'appearance'}
		<section class="border border-border bg-card p-5">
			<p class="text-sm font-semibold text-foreground">Colour Scheme</p>
			<p class="mt-1 mb-5 text-sm text-muted-foreground">Choose your preferred visual theme.</p>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{#each themes as theme (theme.value)}
					{@const Icon = theme.icon}
					<button
						type="button"
						onclick={() => setMode(theme.value)}
						class="flex flex-col items-center gap-2 border-2 p-4 text-sm font-semibold transition-all {userPrefersMode.current ===
						theme.value
							? 'border-primary bg-muted text-primary'
							: 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'}"
					>
						<Icon class="size-5" />
						{theme.label}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if activeTab === 'notifications'}
		<section class="border border-border bg-card">
			<div class="divide-y divide-border/60">
				{#each [{ key: 'priceAlerts' as const, label: 'Price Alerts', description: 'Notify when a stock hits your threshold' }, { key: 'tradeConfirmations' as const, label: 'Trade Confirmations', description: 'Confirm every buy and sell order' }, { key: 'weeklyReport' as const, label: 'Weekly Report', description: 'Portfolio summary every Monday' }] as item (item.key)}
					<div class="flex items-center justify-between gap-4 px-5 py-4">
						<div>
							<p class="text-sm font-semibold text-foreground">{item.label}</p>
							<p class="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-label={item.label}
							aria-checked={userStore.settings.notifications[item.key]}
							onclick={() =>
								userStore.updateNotifications({
									[item.key]: !userStore.settings.notifications[item.key]
								})}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {userStore
								.settings.notifications[item.key]
								? 'bg-primary'
								: 'border border-border bg-muted'}"
						>
							<span
								class="pointer-events-none inline-block size-4 bg-background ring-0 transition-transform {userStore
									.settings.notifications[item.key]
									? 'translate-x-4'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<ConfirmDialog
	bind:open={defaultDialogOpen}
	title="Force portfolio default?"
	message="Are you sure? Your active portfolio will be marked as defaulted. You will receive a fresh $1,000 portfolio unless this is your third default."
	confirmLabel="Yes, force default"
	cancelLabel="Cancel"
	confirming={forcingDefault}
	onConfirm={handleForceDefault}
/>
