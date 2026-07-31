<!--
  Purpose: Authenticate an existing user.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AuthShell from '$lib/components/app/AuthShell.svelte';
	import FormAlert from '$lib/components/app/FormAlert.svelte';
	import FormField from '$lib/components/app/FormField.svelte';
	import SubmitButton from '$lib/components/app/SubmitButton.svelte';
	import { signIn } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isSubmitting) return;

		errorMessage = null;
		isSubmitting = true;

		const { error } = await signIn.email({
			email: email.trim(),
			password
		});

		if (error) {
			errorMessage =
				error.message ?? 'Could not sign you in. Check your credentials and try again.';
			toast.error(errorMessage);
			isSubmitting = false;
			return;
		}

		await goto(resolve('/dashboard'), { replaceState: true, invalidateAll: true });
	}
</script>

<AuthShell
	title="Sign in"
	heading="Welcome back"
	description="Sign in to your trading account to continue."
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
			placeholder="you@example.com"
		/>

		<FormField
			id="password"
			label="Password"
			type="password"
			autocomplete="current-password"
			required
			bind:value={password}
			disabled={isSubmitting}
			placeholder="••••••••"
		>
			{#snippet labelEnd()}
				<a
					href={resolve('/forgot-password')}
					class="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					>Forgot password?</a
				>
			{/snippet}
		</FormField>

		<FormAlert message={errorMessage} />

		<SubmitButton
			class="w-full"
			label="Sign in"
			loadingLabel="Signing in…"
			loading={isSubmitting}
			disabled={!email || !password}
		/>
	</form>

	{#snippet footer()}
		<a
			href={resolve('/signup')}
			class="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</a
		>
	{/snippet}
</AuthShell>
