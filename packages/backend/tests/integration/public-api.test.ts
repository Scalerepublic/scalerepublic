import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { createApp } from '../../src/app.ts';
import { createAppContext } from '../../src/context.ts';
import { db } from '../../src/db/index.ts';
import { apiKey } from '../../src/db/schema/developer/api-key.ts';
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts';

const app = createApp(createAppContext());

const bearer = (secret: string) => ({
  Authorization: `Bearer ${secret}`,
});

const errorResponse = z.object({ error: z.string() });

const createTradeKey = async (userId: string, scopes: Array<'read' | 'trade'>) => {
  const ctx = createAppContext();
  await ctx.developerService.enableDeveloperMode(userId);
  return ctx.developerService.createApiKey(userId, {
    name: 'Test key',
    scopes,
  });
};

beforeEach(resetDb);

describe('GET /api/public/v1/stocks', () => {
  test('returns 401 without Authorization header', async () => {
    const res = await app.request('/api/public/v1/stocks');
    expect(res.status).toBe(401);
    expect(errorResponse.parse(await res.json()).error).toContain('Authorization');
  });

  test('returns 401 for invalid key', async () => {
    const res = await app.request('/api/public/v1/stocks', {
      headers: bearer('sr_invalidtoken'),
    });
    expect(res.status).toBe(401);
  });

  test('returns 401 for expired key', async () => {
    const { userId } = await seedPortfolio();
    const key = await createTradeKey(userId, ['read']);
    await db
      .update(apiKey)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(apiKey.id, key.id));

    const res = await app.request('/api/public/v1/stocks', {
      headers: bearer(key.secret),
    });
    expect(res.status).toBe(401);
  });

  test('returns 403 when read scope is missing for portfolio trade', async () => {
    const { userId } = await seedPortfolio();
    const key = await createTradeKey(userId, ['read']);
    const { stockId } = await seedStock();
    await seedPrice(stockId, 100);

    const res = await app.request('/api/public/v1/portfolio/buy', {
      method: 'POST',
      headers: {
        ...bearer(key.secret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stockId, quantity: 1, price: 100 }),
    });
    expect(res.status).toBe(403);
  });

  test('returns 429 when rate limit exceeded', async () => {
    process.env.API_KEY_RATE_LIMIT_MAX_REQUESTS = '1';
    process.env.API_KEY_RATE_LIMIT_WINDOW_MS = '60000';

    const { userId } = await seedPortfolio();
    const key = await createTradeKey(userId, ['read']);

    const first = await app.request('/api/public/v1/stocks', {
      headers: bearer(key.secret),
    });
    expect(first.status).toBe(200);

    const second = await app.request('/api/public/v1/stocks', {
      headers: bearer(key.secret),
    });
    expect(second.status).toBe(429);
    expect(second.headers.get('Retry-After')).not.toBeNull();

    delete process.env.API_KEY_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.API_KEY_RATE_LIMIT_WINDOW_MS;
  });

  test('buy/sell are scoped to the key owner portfolio', async () => {
    const owner = await seedPortfolio({ cashBalance: '1000.00' });
    const other = await seedPortfolio({ cashBalance: '1000.00' });
    const key = await createTradeKey(owner.userId, ['read', 'trade']);
    const { stockId } = await seedStock();
    await seedPrice(stockId, 100);

    const buyRes = await app.request('/api/public/v1/portfolio/buy', {
      method: 'POST',
      headers: {
        ...bearer(key.secret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stockId, quantity: 1, price: 100 }),
    });
    expect(buyRes.status).toBe(200);

    const portfolioRes = await app.request('/api/public/v1/portfolio', {
      headers: bearer(key.secret),
    });
    expect(portfolioRes.status).toBe(200);

    const portfolioSchema = z.object({
      data: z.object({
        portfolio: z.object({ userId: z.string() }),
        holdings: z.array(z.object({ stockId: z.string(), quantity: z.coerce.number() })),
      }),
    });
    const { data } = portfolioSchema.parse(await portfolioRes.json());
    expect(data.portfolio.userId).toBe(owner.userId);
    expect(data.portfolio.userId).not.toBe(other.userId);
    expect(data.holdings.some((holding) => holding.stockId === stockId)).toBe(true);
  });
});
