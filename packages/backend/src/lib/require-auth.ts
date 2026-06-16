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
    const userId = session?.user.id;
    if (userId === undefined || userId === '') return null;
    return {
        user: {
            id: userId,
            email: session.user.email,
            name: session.user.name,
        },
    };
};

export const requireAuth = async (c: AppContext): Promise<AuthSession | Response> => {
    const { auth } = useCtx(c);
    const session = await getSession(auth, c);
    if (session === null) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    return session;
};
