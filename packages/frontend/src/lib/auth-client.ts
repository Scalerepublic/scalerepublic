import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

export type Session = ReturnType<typeof useSession> extends { get: () => infer T } ? T : never;
