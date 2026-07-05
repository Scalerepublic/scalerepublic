import { z } from 'zod';

export const publicTradeBodySchema = z.object({
  stockId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  price: z.number().positive(),
});

export const publicTickerParamSchema = z.object({
  ticker: z.string().min(1),
});
