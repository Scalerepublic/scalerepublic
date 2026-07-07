type PublicRoute = {
    method: string;
    path: string;
};

const PUBLIC_API_ROUTES: PublicRoute[] = [
    { method: 'GET', path: '/api/v1/auth/email-available' },
    { method: 'POST', path: '/api/v1/auth/reset-password' },
];

export const isPublicApiRoute = (method: string, path: string): boolean =>
    PUBLIC_API_ROUTES.some((route) => route.method === method && route.path === path);
