import { z } from "zod";

export const userIdParamSchema = z.object({
    userId: z.string().min(1),
});

export const tradeBodySchema = z.object({
    userId: z.string().min(1),
    stockId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
});
