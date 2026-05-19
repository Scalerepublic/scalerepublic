<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Landmark, Loader2 } from '@lucide/svelte';
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

<div class="flex min-h-svh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 flex flex-col items-center text-center">
			<div
				class="flex size-11 items-center justify-center rounded-xl border border-accent/35 bg-accent/10 text-accent"
			>
				<Landmark class="size-5" />
			</div>
			<p class="mt-4 font-serif text-xl leading-tight font-bold tracking-wide text-foreground">
				ScaleRepublic
			</p>
			<div class="mt-2 flex items-center gap-2">
				<div class="h-px w-8 bg-accent/40"></div>
				<span class="text-[10px] font-semibold tracking-[0.22em] text-accent/80 uppercase"
					>Exchange</span
				>
				<div class="h-px w-8 bg-accent/40"></div>
			</div>
		</div>

		<div class="rounded-2xl border border-border bg-card p-7 shadow-sm">
			<header class="mb-6">
				<h1 class="font-serif text-2xl font-bold text-foreground">Open an account</h1>
			</header>

			<form class="space-y-4" onsubmit={handleSubmit} novalidate>
				<div class="space-y-1.5">
					<label for="name" class="text-sm font-semibold text-foreground">Full name</label>
					<input
						id="name"
						type="text"
						autocomplete="name"
						required
						bind:value={name}
						disabled={isSubmitting}
						placeholder="Jane Doe"
						class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="email" class="text-sm font-semibold text-foreground">Email</label>
					<input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						disabled={isSubmitting}
						placeholder="you@example.com"
						class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="text-sm font-semibold text-foreground">Password</label>
					<input
						id="password"
						type="password"
						autocomplete="new-password"
						required
						minlength={8}
						bind:value={password}
						disabled={isSubmitting}
						placeholder="At least 8 characters"
						class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="confirm-password" class="text-sm font-semibold text-foreground"
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
						class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
					/>
					{#if !passwordsMatch}
						<p class="text-xs font-medium text-destructive">Passwords don&apos;t match.</p>
					{/if}
				</div>

				{#if errorMessage}
					<div
						role="alert"
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
					>
						{errorMessage}
					</div>
				{/if}

				<button
					type="submit"
					disabled={isSubmitting || !canSubmit}
					class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[oklch(0.58_0.09_80)] bg-linear-to-b from-[oklch(0.76_0.12_80)] to-[oklch(0.62_0.10_80)] text-sm font-semibold tracking-wide text-[oklch(0.14_0.025_250)] shadow-[0_3px_0_0_oklch(0.48_0.08_80),0_4px_8px_0_oklch(0.48_0.08_80/0.35)] transition-all hover:from-[oklch(0.79_0.12_80)] hover:to-[oklch(0.65_0.10_80)] active:translate-y-px active:shadow-[0_1px_0_0_oklch(0.48_0.08_80)] disabled:pointer-events-none disabled:opacity-50"
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

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Already have an account?
			<a
				href={resolve('/login')}
				class="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</a
			>
		</p>
	</div>
</div>
