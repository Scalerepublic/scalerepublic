/**
 * Purpose: Configure the typed Hono client and normalize unsuccessful API responses.
 */
import { createApiClient } from 'backend/api-client';
import type { ClientResponse } from 'hono/client';

import { ApiError } from '$lib/api';

const API_BASE =
	typeof window !== 'undefined' ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:50030');

const DEFAULT_TIMEOUT_MS = 15_000;

const mergeAbortSignals = (
	timeoutSignal: AbortSignal,
	callerSignal?: AbortSignal | null
): AbortSignal => {
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

type ApiData<R> =
	R extends ClientResponse<infer O, number, 'json'>
		? O extends { data: infer D }
			? D
			: never
		: never;

export async function parseApiData<R extends ClientResponse<unknown>>(res: R): Promise<ApiData<R>> {
	let json: { data?: unknown; error?: unknown };
	try {
		json = (await res.json()) as { data?: unknown; error?: unknown };
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

	return json.data as ApiData<R>;
}
