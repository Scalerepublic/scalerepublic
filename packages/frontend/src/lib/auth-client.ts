import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined' ? window.location.origin : undefined
});

export const { signIn, signUp, signOut, useSession } = authClient;

export type Session = ReturnType<typeof useSession> extends { get: () => infer T } ? T : never;
