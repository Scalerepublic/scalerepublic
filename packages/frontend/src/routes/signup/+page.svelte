<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AuthShell from '$lib/components/app/AuthShell.svelte';
	import FormAlert from '$lib/components/app/FormAlert.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import SubmitButton from '$lib/components/app/SubmitButton.svelte';
	import { signUp } from '$lib/auth-client';
	import { firstIssue } from '$lib/validation';
	import { emailSchema, passwordSchema } from 'backend/validation';
	import { toast } from 'svelte-sonner';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const emailIssue = $derived(firstIssue(emailSchema, email.trim()));
	const passwordIssue = $derived(firstIssue(passwordSchema, password));
	const passwordsMatch = $derived(password.length === 0 || password === confirmPassword);
	const canSubmit = $derived(
		name.trim().length > 0 &&
			emailSchema.safeParse(email.trim()).success &&
			passwordSchema.safeParse(password).success &&
			password === confirmPassword
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isSubmitting || !canSubmit) return;

		errorMessage = null;
		isSubmitting = true;

		const { error } = await signUp.email({
			name: name.trim(),
			email: email.trim(),
			password,
			callbackURL: resolve('/dashboard')
		});

		if (error) {
			errorMessage = error.message ?? 'Could not create your account. Please try again.';
			toast.error(errorMessage);
			isSubmitting = false;
			return;
		}

		await goto(resolve('/dashboard'), { replaceState: true, invalidateAll: true });
	}
</script>

<AuthShell title="Create account" heading="Open an account">
	<form class="space-y-4" onsubmit={handleSubmit} novalidate>
		<FormField
			id="name"
			label="Full name"
			type="text"
			autocomplete="name"
			required
			bind:value={name}
			disabled={isSubmitting}
			placeholder="Jane Doe"
		/>

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
			label="Password"
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
			label="Confirm password"
			type="password"
			autocomplete="new-password"
			required
			bind:value={confirmPassword}
			disabled={isSubmitting}
			error={passwordsMatch ? null : 'Passwords don’t match.'}
			placeholder="Repeat your password"
		/>

		<FormAlert message={errorMessage} />

		<SubmitButton
			class="w-full"
			label="Create account"
			loadingLabel="Creating account…"
			loading={isSubmitting}
			disabled={!canSubmit}
		/>
	</form>

	{#snippet footer()}
		<a
			href={resolve('/login')}
			class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a
		>
	{/snippet}
</AuthShell>
