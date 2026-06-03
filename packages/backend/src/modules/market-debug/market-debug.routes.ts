import { Hono } from 'hono';

import { isMarketDebugEnabled } from '../../lib/market-debug.ts';
import { useCtx, type App, type AppEnv } from '../../context.ts';

export const marketDebugRoutes = new Hono<AppEnv>()
    .get('/api/v1/debug/market', (c) => {
        if (!isMarketDebugEnabled()) {
            return c.json({ error: 'Market debug disabled' }, 404);
        }
        const { marketDebugService } = useCtx(c);
        return c.json({ data: marketDebugService.status() });
    })
    .post('/api/v1/debug/market/advance', async (c) => {
        if (!isMarketDebugEnabled()) {
            return c.json({ error: 'Market debug disabled' }, 404);
        }
        const { marketDebugService } = useCtx(c);
        const status = marketDebugService.advanceDay();
        const tick = await marketDebugService.applyGbmTick();
        return c.json({ data: { ...status, ...tick } });
    })
    .post('/api/v1/debug/market/retreat', (c) => {
        if (!isMarketDebugEnabled()) {
            return c.json({ error: 'Market debug disabled' }, 404);
        }
        const { marketDebugService } = useCtx(c);
        return c.json({ data: marketDebugService.retreatDay() });
    })
    .post('/api/v1/debug/market/tick', async (c) => {
        if (!isMarketDebugEnabled()) {
            return c.json({ error: 'Market debug disabled' }, 404);
        }
        const { marketDebugService } = useCtx(c);
        const tick = await marketDebugService.applyGbmTick();
        return c.json({ data: tick });
    });

export const registerMarketDebugRoutes = (app: App) => {
    app.route('/', marketDebugRoutes);
};
