<script lang="ts">
	import FormAlert from '$lib/components/app/FormAlert.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import SubmitButton from '$lib/components/app/SubmitButton.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { checkEmailAvailable } from '$lib/api/queries';
	import { changePassword, changeEmail } from '$lib/auth-client';
	import { firstIssue } from '$lib/validation';
	import { emailSchema, passwordSchema } from 'backend/validation';
	import { toast } from 'svelte-sonner';
	import { KeyRound, AtSign } from '@lucide/svelte';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let isChangingPassword = $state(false);
	let passwordError = $state<string | null>(null);

	const newPasswordIssue = $derived(firstIssue(passwordSchema, newPassword));
	const passwordsMatch = $derived(
		newPassword.length === 0 ||
			confirmNewPassword.length === 0 ||
			newPassword === confirmNewPassword
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

	const newEmailIssue = $derived(firstIssue(emailSchema, newEmail.trim()));
	const canChangeEmail = $derived(
		emailSchema.safeParse(newEmail.trim()).success &&
			newEmail.trim().toLowerCase() !== (authStore.user?.email ?? '').toLowerCase()
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
			const available = await checkEmailAvailable(trimmedEmail);
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
</script>

<div class="space-y-5">
	<section class="rounded-xl border border-border bg-card">
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
			<FormField
				id="current-password"
				label="Current password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={currentPassword}
				disabled={isChangingPassword}
				placeholder="••••••••"
			/>

			<FormField
				id="new-password"
				label="New password"
				type="password"
				autocomplete="new-password"
				required
				minlength={8}
				bind:value={newPassword}
				disabled={isChangingPassword}
				error={newPasswordIssue}
				hint="Must be at least 8 characters."
				placeholder="At least 8 characters"
			/>

			<FormField
				id="confirm-new-password"
				label="Confirm new password"
				type="password"
				autocomplete="new-password"
				required
				bind:value={confirmNewPassword}
				disabled={isChangingPassword}
				error={passwordsMatch ? null : 'Passwords do not match.'}
				placeholder="••••••••"
			/>

			<FormAlert message={passwordError} />

			<SubmitButton
				class="px-5"
				label="Update password"
				loadingLabel="Updating…"
				loading={isChangingPassword}
				disabled={!canChangePassword}
			/>
		</form>
	</section>

	<section class="rounded-xl border border-border bg-card">
		<header class="flex items-center gap-2.5 border-b border-border px-5 py-4">
			<AtSign class="size-4 shrink-0 text-muted-foreground" />
			<div>
				<p class="text-sm font-semibold text-foreground">Change email</p>
				<p class="text-xs text-muted-foreground">
					Current: <span class="font-medium text-foreground">{authStore.user?.email ?? ''}</span>
				</p>
			</div>
		</header>
		<form class="space-y-4 p-5" onsubmit={handleChangeEmail} novalidate>
			<FormField
				id="new-email"
				label="New email"
				type="email"
				autocomplete="email"
				required
				bind:value={newEmail}
				disabled={isChangingEmail}
				error={newEmailIssue}
				placeholder="you@example.com"
			/>

			<FormAlert message={emailError} />

			<SubmitButton
				class="px-5"
				label="Update email"
				loadingLabel="Updating…"
				loading={isChangingEmail}
				disabled={!canChangeEmail}
			/>
		</form>
	</section>
</div>
