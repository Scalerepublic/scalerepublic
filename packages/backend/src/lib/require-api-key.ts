import { useCtx, type AppContext } from '../context.ts';
import type { ApiKeyScope } from '../modules/developer/developer.service.ts';
import { ApiKeyRateLimitError, ApiKeyScopeError } from '../modules/developer/errors.ts';

import { parseBearerApiKey } from './api-key.ts';

export type ApiKeyAuth = {
  userId: string;
  keyId: string;
  scopes: ApiKeyScope[];
};

export const requireApiKey = async (
  c: AppContext,
  scope: ApiKeyScope,
): Promise<ApiKeyAuth | Response> => {
  const rawSecret = parseBearerApiKey(c.req.header('authorization'));
  if (rawSecret === null) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const { developerService } = useCtx(c);

  try {
    const verified = await developerService.verifyApiKey(rawSecret);
    if (verified === null) {
      return c.json({ error: 'Invalid or expired API key' }, 401);
    }

    if (!verified.scopes.includes(scope)) {
      throw new ApiKeyScopeError(scope);
    }

    return verified;
  } catch (err) {
    if (err instanceof ApiKeyRateLimitError) {
      c.header('Retry-After', String(err.retryAfterSeconds));
      return c.json({ error: err.message }, 429);
    }
    if (err instanceof ApiKeyScopeError) {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
};
