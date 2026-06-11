import type { Handle } from '@sveltejs/kit';

const apiOrigin = process.env.API_ORIGIN ?? process.env.VITE_API_URL ?? 'http://localhost:3000';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	if (!pathname.startsWith('/api') && pathname !== '/health') {
		return resolve(event);
	}

	const target = `${apiOrigin}${pathname}${search}`;
	const headers = new Headers(event.request.headers);
	headers.delete('host');

	const init: RequestInit = {
		method: event.request.method,
		headers,
		duplex: 'half'
	};

	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		init.body = event.request.body;
	}

	return fetch(target, init);
};
