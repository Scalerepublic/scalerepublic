import { z } from 'zod'

export const calculateStockBodySchema = z.object({
    symbol: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive(),
})
