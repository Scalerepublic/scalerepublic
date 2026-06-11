import { authClient } from '$lib/auth-client';

type SessionAtomValue = ReturnType<ReturnType<typeof authClient.useSession>['get']>;

class AuthStore {
	private atom = authClient.useSession();
	value = $state<SessionAtomValue>(this.atom.get());

	constructor() {
		this.atom.subscribe((next) => {
			this.value = next;
		});
	}

	get user() {
		return this.value.data?.user ?? null;
	}

	get session() {
		return this.value.data?.session ?? null;
	}

	get isPending() {
		return this.value.isPending;
	}

	get error() {
		return this.value.error;
	}

	get isAuthenticated() {
		return !this.value.isPending && this.value.data?.user != null;
	}
}

export const authStore = new AuthStore();
