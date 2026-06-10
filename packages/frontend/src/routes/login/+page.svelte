<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Loader2 } from '@lucide/svelte';
	import { signIn } from '$lib/auth-client';

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
			isSubmitting = false;
			return;
		}

		await goto(resolve('/dashboard'), { replaceState: true, invalidateAll: true });
	}
</script>

<svelte:head><title>Sign in · ScaleRepublic</title></svelte:head>

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
				<h1 class="font-serif text-2xl font-bold text-foreground">Welcome back</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					Sign in to your trading account to continue.
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
						autocomplete="current-password"
						required
						bind:value={password}
						disabled={isSubmitting}
						placeholder="••••••••"
						class="h-10 w-full border border-input bg-background px-3 text-sm transition outline-none placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
					/>
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
					disabled={isSubmitting || !email || !password}
					class="btn-primary inline-flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50"
				>
					{#if isSubmitting}
						<Loader2 class="size-4 animate-spin" />
						Signing in…
					{:else}
						Sign in
					{/if}
				</button>
			</form>
		</div>

		<p class="mt-5 text-center text-sm text-muted-foreground">
			Don&apos;t have an account?
			<a
				href={resolve('/signup')}
				class="font-semibold text-foreground underline-offset-4 hover:underline">Create one</a
			>
		</p>
	</div>
</div>
