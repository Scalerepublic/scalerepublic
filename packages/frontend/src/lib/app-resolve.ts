/**
 * Purpose: Resolve application links correctly when SvelteKit is deployed under a base path.
 */
import { resolve } from '$app/paths';
import type { RouteId } from '$app/types';

type AppResolve = (route: RouteId) => ReturnType<typeof resolve>;

export const appResolve: AppResolve = (route) => (resolve as AppResolve)(route);
