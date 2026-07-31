/**
 * Purpose: Validate and serve authenticated automatic-order list, create, and cancel endpoints.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppContext, type AppEnv } from "../../context.ts";
import {
    InsufficientFundsError,
    InsufficientHoldingsError,
    PortfolioDefaultedError,
    PortfolioNotFoundError,
} from "../portfolio/errors.ts";

import {
    autoTradeIdParamSchema,
    autoTradePortfolioParamSchema,
    createAutoTradeBodySchema,
} from "./autotrade.schema.ts";
import { AutoTradeNotFoundError, InvalidAutoTradeError } from "./errors.ts";

const handleError = (c: AppContext, err: unknown) => {
    if (err instanceof InvalidAutoTradeError) return c.json({ error: err.message }, 400);
    if (err instanceof AutoTradeNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof PortfolioNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof PortfolioDefaultedError) return c.json({ error: err.message }, 403);
    if (err instanceof InsufficientFundsError) return c.json({ error: err.message }, 422);
    if (err instanceof InsufficientHoldingsError) return c.json({ error: err.message }, 422);
    throw err;
};

export const autoTradeRoutes = new Hono<AppEnv>()
    .get(
        "/api/v1/portfolio/:portfolioId/autotrades",
        zValidator("param", autoTradePortfolioParamSchema),
        async (c) => {
            const { portfolioId } = c.req.valid("param");
            const { autoTradeService, stockService } = useCtx(c);

            try {
                const rules = await autoTradeService.getByPortfolioId(portfolioId);
                const data = await Promise.all(
                    rules.map(async (rule) => ({
                        ...rule,
                        ticker: await stockService.getTicker(rule.stockId),
                    })),
                );
                return c.json({ data });
            } catch (err) {
                return handleError(c, err);
            }
        },
    )
    .post(
        "/api/v1/autotrade",
        zValidator("json", createAutoTradeBodySchema),
        async (c) => {
            const body = c.req.valid("json");
            const { autoTradeService } = useCtx(c);

            try {
                const rule = await autoTradeService.createAutoTrade(body);
                return c.json({ data: rule }, 201);
            } catch (err) {
                return handleError(c, err);
            }
        },
    )
    .post(
        "/api/v1/autotrade/:ruleId/cancel",
        zValidator("param", autoTradeIdParamSchema),
        async (c) => {
            const { ruleId } = c.req.valid("param");
            const { autoTradeService } = useCtx(c);

            try {
                const rule = await autoTradeService.cancelAutoTrade(ruleId);
                return c.json({ data: rule });
            } catch (err) {
                return handleError(c, err);
            }
        },
    );

export const registerAutoTradeRoutes = (app: App) => {
    app.route('/', autoTradeRoutes);
};
