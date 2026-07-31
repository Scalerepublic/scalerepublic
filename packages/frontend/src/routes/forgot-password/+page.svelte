<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AuthShell from '$lib/components/app/AuthShell.svelte';
	import FormAlert from '$lib/components/app/FormAlert.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import SubmitButton from '$lib/components/app/SubmitButton.svelte';
	import { firstIssue } from '$lib/validation';
	import { emailSchema, passwordSchema } from 'backend/validation';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const emailIssue = $derived(firstIssue(emailSchema, email.trim()));
	const passwordIssue = $derived(firstIssue(passwordSchema, password));
	const passwordsMatch = $derived(password.length === 0 || password === confirmPassword);
	const canSubmit = $derived(
		emailSchema.safeParse(email.trim()).success &&
			passwordSchema.safeParse(password).success &&
			password === confirmPassword
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isSubmitting || !canSubmit) return;

		errorMessage = null;
		isSubmitting = true;

		try {
			const res = await fetch('/api/v1/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: email.trim(), newPassword: password })
			});

			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as { error?: string } | null;
				errorMessage = body?.error ?? 'Could not reset your password. Please try again.';
				toast.error(errorMessage);
				isSubmitting = false;
				return;
			}

			toast.success('Password updated. You can sign in with your new password.');
			await goto(resolve('/login'), { replaceState: true });
		} catch {
			errorMessage = 'Could not reach the server. Please try again.';
			toast.error(errorMessage);
			isSubmitting = false;
		}
	}
</script>

<AuthShell
	title="Reset password"
	heading="Reset your password"
	description="Verify your email and choose a new password."
>
	<form class="space-y-4" onsubmit={handleSubmit} novalidate>
		<FormField
			id="email"
			label="Email"
			type="email"
			autocomplete="email"
			required
			bind:value={email}
			disabled={isSubmitting}
			error={emailIssue}
			placeholder="you@example.com"
		/>

		<FormField
			id="password"
			label="New password"
			type="password"
			autocomplete="new-password"
			required
			minlength={8}
			bind:value={password}
			disabled={isSubmitting}
			error={passwordIssue}
			hint="Must be at least 8 characters."
			placeholder="At least 8 characters"
		/>

		<FormField
			id="confirm-password"
			label="Confirm new password"
			type="password"
			autocomplete="new-password"
			required
			bind:value={confirmPassword}
			disabled={isSubmitting}
			error={passwordsMatch ? null : 'Passwords do not match.'}
			placeholder="••••••••"
		/>

		<FormAlert message={errorMessage} />

		<SubmitButton
			class="w-full"
			label="Reset password"
			loadingLabel="Updating…"
			loading={isSubmitting}
			disabled={!canSubmit}
		/>
	</form>

	{#snippet footer()}
		<a
			href={resolve('/login')}
			class="font-semibold text-foreground underline-offset-4 hover:underline">Back to sign in</a
		>
	{/snippet}
</AuthShell>
