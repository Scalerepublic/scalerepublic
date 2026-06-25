import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const performanceQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
});
