import { z } from "zod";

export const autoTradeIdParamSchema = z.object({
    ruleId: z.string().min(1),
});

export const autoTradePortfolioParamSchema = z.object({
    portfolioId: z.string().min(1),
});

export const createAutoTradeBodySchema = z.object({
    portfolioId: z.string().min(1),
    stockId: z.string().min(1),
    ruleType: z.enum(["BUY", "SELL"]),
    priceThreshold: z.number().positive(),
    quantity: z.coerce.number().int().positive(),
    expiresAt: z.coerce.date().optional(),
});
