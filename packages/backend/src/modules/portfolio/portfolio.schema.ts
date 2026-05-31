import { z } from "zod";

export const portfolioIdParamSchema = z.object({
    portfolioId: z.string().min(1),
});

export const tradeBodySchema = z.object({
    portfolioId: z.string().min(1),
    stockId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    price: z.number().positive(),
});
