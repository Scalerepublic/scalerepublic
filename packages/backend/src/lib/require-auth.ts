import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { useCtx, type AppContext, type AppEnv } from '../context.ts';

import { isPublicApiRoute } from './public-routes.ts';

import type { Auth } from './auth.ts';

export type AuthSession = {
    user: {
        id: string;
        email: string;
        name: string;
    };
};

const getSession = async (auth: Auth, c: AppContext): Promise<AuthSession | null> => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session === null || session.user.id === '') return null;
    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        },
    };
};

export const requireAuth = async (c: AppContext): Promise<AuthSession> => {
    const { auth } = useCtx(c);
    const session = await getSession(auth, c);
    if (session === null) {
        throw new HTTPException(401, {
            res: c.json({ error: 'Unauthorized' }, 401),
        });
    }
    return session;
};

export const getAuthSession = (c: AppContext): AuthSession | undefined => c.get('authSession');

export const requirePortfolioOwnership = async (
    c: AppContext,
    portfolioId: string,
): Promise<Response | null> => {
    const authSession = getAuthSession(c);
    if (!authSession) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { portfolioService } = useCtx(c);

    try {
        const portfolioRow = await portfolioService.getById(portfolioId);
        if (portfolioRow.userId !== authSession.user.id) {
            return c.json({ error: 'Forbidden' }, 403);
        }
    } catch {
        return c.json({ error: 'Portfolio not found' }, 404);
    }

    return null;
};

export const requireApiAuth = createMiddleware<AppEnv>(async (c, next) => {
    if (isPublicApiRoute(c.req.method, c.req.path)) {
        return next();
    }

    const authSession = await requireAuth(c);
    c.set('authSession', authSession);
    return next();
});
