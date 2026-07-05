import { beforeEach, describe, expect, test } from 'bun:test';

import { createAppContext } from '../../src/context.ts';
import { db } from '../../src/db/index.ts';
import { user } from '../../src/db/schema/auth-schema.ts';
import { resetDb } from '../helpers/db.ts';

beforeEach(resetDb);

describe('UserService.getUserProfile', () => {
  test('creates portfolio and returns active profile for new user without one', async () => {
    const ctx = createAppContext();
    const userId = crypto.randomUUID();

    await db.insert(user).values({
      id: userId,
      name: 'New Trader',
      email: `${userId}@test.com`,
    });

    const profile = await ctx.userService.getUserProfile(userId);

    expect(profile).not.toBeNull();
    expect(profile?.isDefaulted).toBe(false);
    expect(profile?.startingCapital).toBe(1000);
    expect(profile?.cashBalance).toBe(1000);
    expect(await ctx.portfolioService.getActiveForUser(userId)).not.toBeNull();
  });
});
