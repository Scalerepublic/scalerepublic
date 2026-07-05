import { createApiClient } from 'backend/api-client';

import { ApiError } from '$lib/api';

const API_BASE =
	typeof window !== 'undefined' ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:50030');

const DEFAULT_TIMEOUT_MS = 15_000;

const mergeAbortSignals = (timeoutSignal: AbortSignal, callerSignal?: AbortSignal | null): AbortSignal => {
	if (callerSignal === undefined || callerSignal === null) {
		return timeoutSignal;
	}
	if (typeof AbortSignal.any === 'function') {
		return AbortSignal.any([timeoutSignal, callerSignal]);
	}
	return timeoutSignal;
};

export const api = createApiClient(API_BASE, {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
		const signal = mergeAbortSignals(controller.signal, init?.signal);

		return fetch(input, {
			...init,
			credentials: 'include',
			signal
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
	let json: { data?: T; error?: string };
	try {
		json = (await res.json()) as { data?: T; error?: string };
	} catch {
		throw new ApiError('Invalid response from server', res.status);
	}

	if (!res.ok) {
		const message = typeof json.error === 'string' ? json.error : `${res.status} ${res.statusText}`;
		throw new ApiError(message, res.status);
	}

	if (json.data === undefined) {
		throw new ApiError('Response missing data', res.status);
	}

	return json.data;
}
