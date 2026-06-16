<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userStore } from '$lib/stores/user.svelte';
	import { portfolioStore } from '$lib/stores/portfolio.svelte';
	import PageHeader from '$lib/components/app/PageHeader.svelte';
	import { signOut } from '$lib/auth-client';
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
		Trophy
	} from '@lucide/svelte';

	let isSigningOut = $state(false);

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

	let activeTab = $state<'profile' | 'account' | 'appearance' | 'notifications'>('profile');

	const tabs = [
		{ id: 'profile' as const, label: 'Profile' },
		{ id: 'account' as const, label: 'Account' },
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
							<a href="/leaderboard" class="text-xs font-medium text-primary hover:underline">
								Leaderboard
							</a>
						</dd>
					</div>
				{/if}
			</dl>
		</section>
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
