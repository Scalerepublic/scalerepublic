<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SettingsRow from './SettingsRow.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { signOut } from '$lib/auth-client';
	import { getInitials } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { Mail, User, Shield, LogOut } from '@lucide/svelte';

	let isSigningOut = $state(false);

	const joinDate = new Date(userStore.profile.joinedAt).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

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
		<SettingsRow icon={User} label="Display Name">
			<span class="text-sm font-medium text-foreground">{userStore.profile.name}</span>
		</SettingsRow>
		<SettingsRow icon={Mail} label="Email">
			<span class="text-sm font-medium text-foreground">{userStore.profile.email}</span>
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
		class="flex w-full items-center justify-center gap-2 border border-destructive/30 bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-50"
	>
		<LogOut class="size-4" />
		{isSigningOut ? 'Signing out…' : 'Sign out'}
	</button>
</section>
