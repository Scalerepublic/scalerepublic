import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { createApp } from '../../src/app.ts';
import { createAppContext } from '../../src/context.ts';
import { db } from '../../src/db/index.ts';
import { apiKey } from '../../src/db/schema/developer/api-key.ts';
import { hashApiKeySecret } from '../../src/lib/api-key.ts';
import { ApiKeyLimitReachedError } from '../../src/modules/developer/errors.ts';
import { resetDb, seedPortfolio } from '../helpers/db.ts';

const app = createApp(createAppContext());

beforeEach(resetDb);

describe('DeveloperService', () => {
  test('enable flow is idempotent', async () => {
    const ctx = createAppContext();
    const { userId } = await seedPortfolio();

    expect(await ctx.developerService.isDeveloper(userId)).toBe(false);
    await ctx.developerService.enableDeveloperMode(userId);
    expect(await ctx.developerService.isDeveloper(userId)).toBe(true);
    await ctx.developerService.enableDeveloperMode(userId);
    expect(await ctx.developerService.isDeveloper(userId)).toBe(true);
  });

  test('create/list/rotate/delete keys and never store plaintext', async () => {
    const ctx = createAppContext();
    const { userId } = await seedPortfolio();
    await ctx.developerService.enableDeveloperMode(userId);

    const created = await ctx.developerService.createApiKey(userId, {
      name: 'CI key',
      scopes: ['read', 'trade'],
    });
    expect(created.secret.startsWith('sr_')).toBe(true);
    expect(created.keyPrefix).toBe(created.secret.slice(0, 12));

    const listed = await ctx.developerService.listApiKeys(userId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect('secret' in (listed[0] as object)).toBe(false);

    const [stored] = await db.select().from(apiKey).where(eq(apiKey.id, created.id));
    expect(stored?.hashedKey).toBe(await hashApiKeySecret(created.secret));
    expect(stored?.hashedKey).not.toBe(created.secret);

    const rotated = await ctx.developerService.rotateApiKey(userId, created.id);
    expect(rotated.secret).not.toBe(created.secret);
    expect(rotated.id).toBe(created.id);

    const verifyOld = await ctx.developerService.verifyApiKey(created.secret);
    expect(verifyOld).toBeNull();

    const verifyNew = await ctx.developerService.verifyApiKey(rotated.secret);
    expect(verifyNew?.userId).toBe(userId);

    await ctx.developerService.deleteApiKey(userId, created.id);
    expect(await ctx.developerService.listApiKeys(userId)).toHaveLength(0);
  });

  test('enforces max keys per user', async () => {
    const ctx = createAppContext();
    const { userId } = await seedPortfolio();
    await ctx.developerService.enableDeveloperMode(userId);

    for (let i = 0; i < 10; i += 1) {
      await ctx.developerService.createApiKey(userId, {
        name: `Key ${i}`,
        scopes: ['read'],
      });
    }

    await expect(
      ctx.developerService.createApiKey(userId, {
        name: 'Overflow',
        scopes: ['read'],
      }),
    ).rejects.toThrow(ApiKeyLimitReachedError);
  });
});

describe('developer routes auth', () => {
  test('requires session for enable endpoint', async () => {
    const res = await app.request('/api/v1/developer/enable', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
