<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Loader2 } from '@lucide/svelte';
	import { emailSchema, passwordSchema } from 'backend/validation';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const emailIssue = $derived(
		email.trim().length === 0
			? null
			: (emailSchema.safeParse(email.trim()).error?.issues[0]?.message ?? null)
	);
	const passwordIssue = $derived(
		password.length === 0
			? null
			: (passwordSchema.safeParse(password).error?.issues[0]?.message ?? null)
	);
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

<svelte:head><title>Reset password · ScaleRepublic</title></svelte:head>

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
				<h1 class="font-serif text-2xl font-bold text-foreground">Reset your password</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					Verify your email and choose a new password.
				</p>
			</header>

			<form class="space-y-4" onsubmit={handleSubmit} novalidate>
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
						aria-invalid={emailIssue !== null}
						placeholder="you@example.com"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
					/>
					{#if emailIssue}
						<p class="text-xs font-medium text-destructive">{emailIssue}</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<label
						for="password"
						class="text-xs font-semibold tracking-wide text-foreground uppercase">New password</label
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
					{#if passwordIssue}
						<p class="text-xs font-medium text-destructive">{passwordIssue}</p>
					{:else}
						<p class="text-xs text-muted-foreground">Must be at least 8 characters.</p>
					{/if}
				</div>

				<div class="space-y-1.5">
					<label
						for="confirm-password"
						class="text-xs font-semibold tracking-wide text-foreground uppercase"
						>Confirm new password</label
					>
					<input
						id="confirm-password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						disabled={isSubmitting}
						placeholder="••••••••"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				{#if !passwordsMatch}
					<p class="text-xs font-medium text-destructive">Passwords do not match.</p>
				{/if}

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
						Updating…
					{:else}
						Reset password
					{/if}
				</button>
			</form>
		</div>

		<p class="mt-5 text-center text-sm text-muted-foreground">

			<a
				href={resolve('/login')}
				class="font-semibold text-foreground underline-offset-4 hover:underline">Back to sign in</a
			>
		</p>
	</div>
</div>
