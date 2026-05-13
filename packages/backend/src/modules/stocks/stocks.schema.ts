import { z } from 'zod'

export const getStockParamsSchema = z.object({
    id: z.string(),
})

// bunu ekle:
export const createStockBodySchema = z.object({
    symbol: z.string(),
    name: z.string(),
    price: z.number().positive(),
})