/**
 * Purpose: Disable SSR for the authenticated browser-focused application.
 */
// Pre-rendering happens for static assets;
// navigations are handled by SvelteKit's client router.
export const ssr = false;
