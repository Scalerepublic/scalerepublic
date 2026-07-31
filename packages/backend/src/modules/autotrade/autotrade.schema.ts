/**
 * Purpose: Validate automatic-order identifiers, trigger direction, price, quantity, and expiry.
 */
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
    triggerDirection: z.enum(["AT_OR_ABOVE", "AT_OR_BELOW"]),
    priceThreshold: z.number().positive(),
    quantity: z.coerce.number().int().positive(),
    expiresAt: z.coerce.date().optional(),
});
