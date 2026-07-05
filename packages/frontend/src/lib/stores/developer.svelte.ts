import { ApiError } from '$lib/api';
import { api, parseApiData } from '$lib/api/client';
import { authStore } from '$lib/stores/auth.svelte';

export type ApiKeyScope = 'read' | 'trade';

export type ApiKeyRecord = {
	id: string;
	name: string;
	keyPrefix: string;
	scopes: ApiKeyScope[];
	lastUsedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
};

export type ApiKeyWithSecret = ApiKeyRecord & {
	secret: string;
};

class DeveloperStore {
	enabled = $state(false);
	keys = $state<ApiKeyRecord[]>([]);
	loading = $state(false);

	async load() {
		const userId = authStore.user?.id;
		if (!userId) {
			this.enabled = false;
			this.keys = [];
			return;
		}

		this.loading = true;
		try {
			const status = await parseApiData<{ enabled: boolean }>(
				await api.api.v1.developer.status.$get()
			);
			this.enabled = status.enabled;
			if (!status.enabled) {
				this.keys = [];
				return;
			}

			this.keys = await parseApiData<ApiKeyRecord[]>(await api.api.v1.developer['api-keys'].$get());
		} catch {
			this.enabled = false;
			this.keys = [];
		} finally {
			this.loading = false;
		}
	}

	async enable(): Promise<void> {
		await parseApiData(await api.api.v1.developer.enable.$post());
		this.enabled = true;
	}

	async createKey(input: {
		name: string;
		scopes: ApiKeyScope[];
		expiresAt?: string;
	}): Promise<ApiKeyWithSecret> {
		const created = await parseApiData<ApiKeyWithSecret>(
			await api.api.v1.developer['api-keys'].$post({
				json: {
					name: input.name,
					scopes: input.scopes,
					expiresAt: input.expiresAt
				}
			})
		);
		const { secret, ...metadata } = created;
		void secret;
		this.keys = [...this.keys, metadata];
		return created;
	}

	async rotateKey(keyId: string): Promise<ApiKeyWithSecret> {
		const rotated = await parseApiData<ApiKeyWithSecret>(
			await api.api.v1.developer['api-keys'][':id'].rotate.$post({
				param: { id: keyId }
			})
		);
		const { secret, ...metadata } = rotated;
		void secret;
		this.keys = this.keys.map((key) => (key.id === keyId ? metadata : key));
		return rotated;
	}

	async deleteKey(keyId: string): Promise<void> {
		await parseApiData(
			await api.api.v1.developer['api-keys'][':id'].$delete({
				param: { id: keyId }
			})
		);
		this.keys = this.keys.filter((key) => key.id !== keyId);
	}
}

export const developerStore = new DeveloperStore();

export function assertDeveloperApiError(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'Something went wrong';
}
