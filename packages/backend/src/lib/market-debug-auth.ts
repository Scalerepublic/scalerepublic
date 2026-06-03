import type { Context } from 'hono';

import { auth } from './auth.ts';
import { getMarketDebugOperatorEmail, isMarketDebugEnabled } from './market-debug.ts';

export const requireMarketDebugOperator = async (
    c: Context,
): Promise<Response | null> => {
    if (!isMarketDebugEnabled()) {
        return c.json({ error: 'Market debug disabled' }, 404);
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const email = session?.user.email?.trim().toLowerCase();
    const allowed = getMarketDebugOperatorEmail();

    if (!email) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (email !== allowed) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    return null;
};
