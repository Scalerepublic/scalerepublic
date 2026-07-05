import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { useCtx, type App, type AppContext, type AppEnv } from '../../context.ts';
import { requireAuth } from '../../lib/require-auth.ts';

import { apiKeyIdParamSchema, createApiKeyBodySchema } from './developer.schema.ts';
import {
  ApiKeyLimitReachedError,
  ApiKeyNotFoundError,
  DeveloperNotEnabledError,
} from './errors.ts';

const handleError = (c: AppContext, err: unknown) => {
  if (err instanceof DeveloperNotEnabledError) return c.json({ error: err.message }, 403);
  if (err instanceof ApiKeyNotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof ApiKeyLimitReachedError) return c.json({ error: err.message }, 422);
  throw err;
};

export const developerRoutes = new Hono<AppEnv>()
  .post('/api/v1/developer/enable', async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const { developerService } = useCtx(c);
    const data = await developerService.enableDeveloperMode(authResult.user.id);
    return c.json({ data });
  })
  .get('/api/v1/developer/status', async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const { developerService } = useCtx(c);
    const enabled = await developerService.isDeveloper(authResult.user.id);
    return c.json({ data: { enabled } });
  })
  .get('/api/v1/developer/api-keys', async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const { developerService } = useCtx(c);
    try {
      const keys = await developerService.listApiKeys(authResult.user.id);
      return c.json({ data: keys });
    } catch (err) {
      return handleError(c, err);
    }
  })
  .post('/api/v1/developer/api-keys', zValidator('json', createApiKeyBodySchema), async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const body = c.req.valid('json');
    const { developerService } = useCtx(c);

    try {
      const key = await developerService.createApiKey(authResult.user.id, body);
      return c.json({ data: key }, 201);
    } catch (err) {
      return handleError(c, err);
    }
  })
  .post('/api/v1/developer/api-keys/:id/rotate', zValidator('param', apiKeyIdParamSchema), async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const { id } = c.req.valid('param');
    const { developerService } = useCtx(c);

    try {
      const key = await developerService.rotateApiKey(authResult.user.id, id);
      return c.json({ data: key });
    } catch (err) {
      return handleError(c, err);
    }
  })
  .delete('/api/v1/developer/api-keys/:id', zValidator('param', apiKeyIdParamSchema), async (c) => {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;

    const { id } = c.req.valid('param');
    const { developerService } = useCtx(c);

    try {
      const result = await developerService.deleteApiKey(authResult.user.id, id);
      return c.json({ data: result });
    } catch (err) {
      return handleError(c, err);
    }
  });

export const registerDeveloperRoutes = (app: App) => {
  app.route('/', developerRoutes);
};
