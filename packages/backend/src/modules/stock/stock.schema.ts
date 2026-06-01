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
