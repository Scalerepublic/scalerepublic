import { and, count, eq } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import { apiKey, developerAccount } from '../../db/schema/developer/index.ts';
import {
  extractApiKeyPrefix,
  generateApiKeySecret,
  hashApiKeySecret,
} from '../../lib/api-key.ts';
import { readEnvNumber } from '../../lib/env-number.ts';

import {
  ApiKeyLimitReachedError,
  ApiKeyNotFoundError,
  ApiKeyRateLimitError,
  DeveloperNotEnabledError,
} from './errors.ts';

export type ApiKeyScope = 'read' | 'trade';

export type ApiKeyMetadata = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export type ApiKeyWithSecret = ApiKeyMetadata & {
  secret: string;
};

export type VerifiedApiKey = {
  userId: string;
  keyId: string;
  scopes: ApiKeyScope[];
};

const MAX_KEYS_PER_USER = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;

export class DeveloperService {
  constructor(private readonly ctx: AppVars) {}

  private get rateLimitWindowMs(): number {
    return readEnvNumber('API_KEY_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS);
  }

  private get rateLimitMaxRequests(): number {
    return readEnvNumber('API_KEY_RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  }

  private toMetadata(row: typeof apiKey.$inferSelect): ApiKeyMetadata {
    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes as ApiKeyScope[],
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async isDeveloper(userId: string): Promise<boolean> {
    const [row] = await this.ctx.db
      .select({ userId: developerAccount.userId })
      .from(developerAccount)
      .where(eq(developerAccount.userId, userId))
      .limit(1);
    return row !== undefined;
  }

  async enableDeveloperMode(userId: string): Promise<{ enabled: true }> {
    await this.ctx.db
      .insert(developerAccount)
      .values({ userId })
      .onConflictDoNothing();
    return { enabled: true };
  }

  async listApiKeys(userId: string): Promise<ApiKeyMetadata[]> {
    const rows = await this.ctx.db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, userId))
      .orderBy(apiKey.createdAt);
    return rows.map((row) => this.toMetadata(row));
  }

  private async assertDeveloper(userId: string): Promise<void> {
    if (!(await this.isDeveloper(userId))) {
      throw new DeveloperNotEnabledError(userId);
    }
  }

  private async assertKeyLimit(userId: string): Promise<void> {
    const [row] = await this.ctx.db
      .select({ value: count() })
      .from(apiKey)
      .where(eq(apiKey.userId, userId));
    if ((row?.value ?? 0) >= MAX_KEYS_PER_USER) {
      throw new ApiKeyLimitReachedError(MAX_KEYS_PER_USER);
    }
  }

  async createApiKey(
    userId: string,
    input: { name: string; scopes: ApiKeyScope[]; expiresAt?: Date },
  ): Promise<ApiKeyWithSecret> {
    await this.assertDeveloper(userId);
    await this.assertKeyLimit(userId);

    const secret = generateApiKeySecret();
    const hashedKey = await hashApiKeySecret(secret);
    const id = crypto.randomUUID();
    const now = new Date();

    const [row] = await this.ctx.db
      .insert(apiKey)
      .values({
        id,
        userId,
        name: input.name,
        keyPrefix: extractApiKeyPrefix(secret),
        hashedKey,
        scopes: input.scopes,
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      ...this.toMetadata(row!),
      secret,
    };
  }

  async rotateApiKey(userId: string, keyId: string): Promise<ApiKeyWithSecret> {
    await this.assertDeveloper(userId);

    const secret = generateApiKeySecret();
    const hashedKey = await hashApiKeySecret(secret);
    const now = new Date();

    const rows = await this.ctx.db
      .update(apiKey)
      .set({
        keyPrefix: extractApiKeyPrefix(secret),
        hashedKey,
        requestWindowStartedAt: null,
        requestWindowCount: 0,
        updatedAt: now,
      })
      .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new ApiKeyNotFoundError(keyId);
    }

    return {
      ...this.toMetadata(row),
      secret,
    };
  }

  async deleteApiKey(userId: string, keyId: string): Promise<{ deleted: true }> {
    await this.assertDeveloper(userId);

    const rows = await this.ctx.db
      .delete(apiKey)
      .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
      .returning({ id: apiKey.id });

    if (rows.length === 0) {
      throw new ApiKeyNotFoundError(keyId);
    }

    return { deleted: true };
  }

  async verifyApiKey(rawSecret: string): Promise<VerifiedApiKey | null> {
    const hashedKey = await hashApiKeySecret(rawSecret);
    const [row] = await this.ctx.db
      .select()
      .from(apiKey)
      .where(eq(apiKey.hashedKey, hashedKey))
      .limit(1);

    if (!row) {
      return null;
    }

    if (row.expiresAt !== null && row.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const now = new Date();
    const windowMs = this.rateLimitWindowMs;
    const maxRequests = this.rateLimitMaxRequests;
    const windowStart = row.requestWindowStartedAt;
    const withinWindow =
      windowStart !== null && now.getTime() - windowStart.getTime() < windowMs;

    if (withinWindow && row.requestWindowCount >= maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (windowStart!.getTime() + windowMs - now.getTime()) / 1000,
      );
      throw new ApiKeyRateLimitError(Math.max(retryAfterSeconds, 1));
    }

    const nextCount = withinWindow ? row.requestWindowCount + 1 : 1;

    await this.ctx.db
      .update(apiKey)
      .set({
        lastUsedAt: now,
        requestWindowStartedAt: withinWindow ? windowStart : now,
        requestWindowCount: nextCount,
        updatedAt: now,
      })
      .where(eq(apiKey.id, row.id));

    return {
      userId: row.userId,
      keyId: row.id,
      scopes: row.scopes as ApiKeyScope[],
    };
  }
}
