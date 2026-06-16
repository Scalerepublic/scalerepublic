import type { Handle } from '@sveltejs/kit';

const apiOrigin = process.env.API_ORIGIN ?? process.env.VITE_API_URL ?? 'http://localhost:3000';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	if (!pathname.startsWith('/api') && pathname !== '/health') {
		return resolve(event);
	}

	const headers = new Headers(event.request.headers);
	headers.delete('host');

	const init: RequestInit & { duplex: 'half' } = {
		method: event.request.method,
		headers,
		duplex: 'half'
	};

	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		init.body = event.request.body;
	}

	const backend = event.platform?.env?.BACKEND;

	if (backend) {
		// Private worker-to-worker call via the service binding (no public hop).
		// The hostname is irrelevant for service bindings, so reuse the incoming
		// origin to keep a valid absolute URL.
		const target = `${event.url.origin}${pathname}${search}`;
		return backend.fetch(new Request(target, init));
	}

	// Local-dev fallback: proxy over HTTP to the standalone backend.
	const target = `${apiOrigin}${pathname}${search}`;
	return fetch(target, init);
};
