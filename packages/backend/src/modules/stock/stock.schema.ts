import { z } from 'zod'

export const priceHistoryQuerySchema = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
})

export const stockDetailQuerySchema = z.object({
    historyDays: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export const stockTrendingQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(24).optional().default(6),
})

export const stockListQuerySchema = z.object({
    q: z.string().trim().optional(),
    sector: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(48).optional().default(24),
})