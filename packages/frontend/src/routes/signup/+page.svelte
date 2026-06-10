<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Loader2 } from '@lucide/svelte';
	import { signUp } from '$lib/auth-client';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const passwordsMatch = $derived(password.length === 0 || password === confirmPassword);
	const canSubmit = $derived(
		name.trim().length > 0 &&
			email.trim().length > 0 &&
			password.length >= 8 &&
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
			isSubmitting = false;
			return;
		}

		await goto(resolve('/dashboard'), { replaceState: true, invalidateAll: true });
	}
</script>

<svelte:head><title>Create account · ScaleRepublic</title></svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<p class="font-sans text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
				ScaleRepublic
			</p>
			<div class="mt-2 flex items-center justify-center gap-3">
				<div class="h-px flex-1 bg-border"></div>
				<span class="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase"
					>Exchange</span
				>
				<div class="h-px flex-1 bg-border"></div>
			</div>
		</div>

		<div class="border border-border bg-card p-7">
			<header class="mb-6 border-b border-border pb-5">
				<h1 class="font-serif text-2xl font-bold text-foreground">Open an account</h1>
			</header>

			<form class="space-y-4" onsubmit={handleSubmit} novalidate>
				<div class="space-y-1.5">
					<label for="name" class="text-xs font-semibold tracking-wide text-foreground uppercase"
						>Full name</label
					>
					<input
						id="name"
						type="text"
						autocomplete="name"
						required
						bind:value={name}
						disabled={isSubmitting}
						placeholder="Jane Doe"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="email" class="text-xs font-semibold tracking-wide text-foreground uppercase"
						>Email</label
					>
					<input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						disabled={isSubmitting}
						placeholder="you@example.com"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label
						for="password"
						class="text-xs font-semibold tracking-wide text-foreground uppercase">Password</label
					>
					<input
						id="password"
						type="password"
						autocomplete="new-password"
						required
						minlength={8}
						bind:value={password}
						disabled={isSubmitting}
						placeholder="At least 8 characters"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label
						for="confirm-password"
						class="text-xs font-semibold tracking-wide text-foreground uppercase"
						>Confirm password</label
					>
					<input
						id="confirm-password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						disabled={isSubmitting}
						aria-invalid={!passwordsMatch}
						placeholder="Repeat your password"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
					/>
					{#if !passwordsMatch}
						<p class="text-xs font-medium text-destructive">Passwords don&apos;t match.</p>
					{/if}
				</div>

				{#if errorMessage}
					<div
						role="alert"
						class="border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive"
					>
						{errorMessage}
					</div>
				{/if}

				<button
					type="submit"
					disabled={isSubmitting || !canSubmit}
					class="btn-primary inline-flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50"
				>
					{#if isSubmitting}
						<Loader2 class="size-4 animate-spin" />
						Creating account…
					{:else}
						Create account
					{/if}
				</button>
			</form>
		</div>

		<p class="mt-5 text-center text-sm text-muted-foreground">
			Already have an account?
			<a
				href={resolve('/login')}
				class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a
			>
		</p>
	</div>
</div>
