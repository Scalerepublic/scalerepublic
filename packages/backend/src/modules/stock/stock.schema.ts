import { z } from 'zod'

export const tradeStockBodySchema = z.object({
    stockId: z.string(),
    quantity: z.number().int().positive(),
    userId: z.string(),
})
