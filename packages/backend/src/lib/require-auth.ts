import { HTTPException } from 'hono/http-exception';

import { useCtx, type AppContext } from '../context.ts';

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
