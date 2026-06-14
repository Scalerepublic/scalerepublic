import { Hono } from 'hono';

import { useCtx, type App, type AppEnv } from '../../context.ts';
import { requireMarketDebugOperator } from '../../lib/market-debug-auth.ts';
import { isMarketDebugEnabled } from '../../lib/market-debug.ts';

export const marketDebugRoutes = new Hono<AppEnv>()
    .get('/api/v1/market/clock', (c) => {
        if (!isMarketDebugEnabled()) {
            const today = new Date().toISOString().slice(0, 10);
            return c.json({ data: { marketDate: today, dayOffset: 0, simulated: false } });
        }
        const { marketDebugService } = useCtx(c);
        const status = marketDebugService.status();
        return c.json({
            data: {
                ...status,
                simulated: true,
            },
        });
    })
    .get('/api/v1/debug/market', async (c) => {
        const denied = await requireMarketDebugOperator(c);
        if (denied) return denied;
        const { marketDebugService } = useCtx(c);
        return c.json({ data: marketDebugService.status() });
    })
    .post('/api/v1/debug/market/advance', async (c) => {
        const denied = await requireMarketDebugOperator(c);
        if (denied) return denied;
        const { marketDebugService } = useCtx(c);
        const status = await marketDebugService.advanceDay();
        const tick = await marketDebugService.applyGbmTick();
        return c.json({ data: { ...status, ...tick } });
    })
    .post('/api/v1/debug/market/retreat', async (c) => {
        const denied = await requireMarketDebugOperator(c);
        if (denied) return denied;
        const { marketDebugService } = useCtx(c);
        return c.json({ data: await marketDebugService.retreatDay() });
    })
    .post('/api/v1/debug/market/tick', async (c) => {
        const denied = await requireMarketDebugOperator(c);
        if (denied) return denied;
        const { marketDebugService } = useCtx(c);
        const tick = await marketDebugService.applyGbmTick();
        return c.json({ data: tick });
    })
    .post('/api/v1/debug/market/crash', async (c) => {
    const denied = await requireMarketDebugOperator(c);
    if (denied) return denied;

    const body = await c.req.json<{ percentage?: number }>();
    const percentage = body.percentage ?? 50;

    if (percentage <= 0 || percentage >= 100) {
        return c.json({ error: 'Percentage must be between 0 and 100' }, 400);
    }

    const { marketDebugService } = useCtx(c);
    const result = await marketDebugService.applyMarketCrash(percentage);

    return c.json({ data: result });
    });

export const registerMarketDebugRoutes = (app: App) => {
    app.route('/', marketDebugRoutes);
};
