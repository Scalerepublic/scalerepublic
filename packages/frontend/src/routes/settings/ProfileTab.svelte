<!--
  Purpose: Edit public profile information.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsRow from './SettingsRow.svelte';
	import { getUserProfile } from '$lib/data/user.svelte';
	import { signOut } from '$lib/auth-client';
	import { getInitials } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { Mail, User, Shield, LogOut } from '@lucide/svelte';

	const account = getUserProfile();

	let isSigningOut = $state(false);

	const joinDate = $derived(
		new Date(account.profile.joinedAt).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

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
</script>

<section class="rounded-xl border border-border bg-card">
	<div class="p-5">
		<div class="flex items-center gap-4">
			<div
				class="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-bold text-foreground"
			>
				{getInitials(account.profile.name)}
			</div>
			<div>
				<p class="font-serif text-lg font-bold text-primary">{account.profile.name}</p>
				<p class="text-sm text-muted-foreground">{account.profile.email}</p>
			</div>
		</div>
	</div>

	<div class="h-px bg-border"></div>

	<dl class="divide-y divide-border/60">
		<SettingsRow icon={User} label="Display Name">
			<span class="text-sm font-medium text-foreground">{account.profile.name}</span>
		</SettingsRow>
		<SettingsRow icon={Mail} label="Email">
			<span class="text-sm font-medium text-foreground">{account.profile.email}</span>
		</SettingsRow>
		<SettingsRow icon={Shield} label="Member since">
			<span class="text-sm font-medium text-foreground">{joinDate}</span>
		</SettingsRow>
	</dl>
</section>

<section class="mt-5 md:hidden">
	<button
		type="button"
		onclick={handleSignOut}
		disabled={isSigningOut}
		class="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-50"
	>
		<LogOut class="size-4" />
		{isSigningOut ? 'Signing out…' : 'Sign out'}
	</button>
</section>
