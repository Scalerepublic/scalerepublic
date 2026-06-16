import type { Auth } from './auth.ts';
import type { AppContext } from '../context.ts';
import { useCtx } from '../context.ts';

export type AuthSession = {
    user: {
        id: string;
        email: string;
        name: string;
    };
};

export const requireAuth = async (c: AppContext): Promise<AuthSession | Response> => {
    const { auth } = useCtx(c);
    const session = await getSession(auth, c);
    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    return session;
};

const getSession = async (auth: Auth, c: AppContext): Promise<AuthSession | null> => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user.id) return null;
    return {
        user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        },
    };
};
