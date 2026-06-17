import { z } from 'zod'

export const calculateStockBodySchema = z.object({
    symbol: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive(),
})

export const priceHistoryQuerySchema = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
})

// Query parameter schema for Stock Detail
export const stockDetailQuerySchema = z.object({
    priceFrom: z.string().datetime().optional(),
    priceTo: z.string().datetime().optional(),
    // Optional user ID used to retrieve the user's trading records
    userId: z.string().optional(),
})