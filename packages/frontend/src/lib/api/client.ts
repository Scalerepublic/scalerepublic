import { createApiClient } from 'backend/api-client';

import { ApiError } from '$lib/api';

const API_BASE =
	typeof window !== 'undefined' ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:3000');

const DEFAULT_TIMEOUT_MS = 15_000;

export const api = createApiClient(API_BASE, {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

		return fetch(input, {
			...init,
			credentials: 'include',
			signal: controller.signal
		})
			.catch((error: unknown) => {
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Request timed out. Is the backend running?');
				}
				throw error;
			})
			.finally(() => clearTimeout(timeout));
	}
});

export async function parseApiData<T>(res: Response): Promise<T> {
	const json = (await res.json()) as { data?: T; error?: string };

	if (!res.ok) {
		const message =
			typeof json.error === 'string' ? json.error : `${res.status} ${res.statusText}`;
		throw new ApiError(message, res.status);
	}

	if (json.data === undefined) {
		throw new ApiError('Response missing data', res.status);
	}

	return json.data;
}
