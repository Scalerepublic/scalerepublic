import { z } from 'zod';

export const apiKeyScopeSchema = z.enum(['read', 'trade']);

export const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  scopes: z.array(apiKeyScopeSchema).min(1),
  expiresAt: z.coerce.date().optional(),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().min(1),
});
