import { zValidator } from "@hono/zod-validator";

import { useCtx, type App, type AppContext } from "../../context.ts";

import {
    InsufficientFundsError,
    InsufficientHoldingsError,
    PortfolioDefaultedError,
    PortfolioNotFoundError,
    PriceMismatchError,
    StockPriceUnavailableError,
} from "./errors.ts";
import { portfolioIdParamSchema, tradeBodySchema } from "./portfolio.schema.ts";

const handleError = (c: AppContext, err: unknown) => {
    if (err instanceof PortfolioNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof PortfolioDefaultedError) return c.json({ error: err.message }, 403);
    if (err instanceof InsufficientFundsError) return c.json({ error: err.message }, 422);
    if (err instanceof InsufficientHoldingsError) return c.json({ error: err.message }, 422);
    if (err instanceof StockPriceUnavailableError) return c.json({ error: err.message }, 422);
    if (err instanceof PriceMismatchError) return c.json({ error: err.message }, 409);
    throw err;
}

export const registerPortfolioRoutes = (app: App) => {
    app.get(
        "/api/v1/portfolio/:portfolioId",
        zValidator("param", portfolioIdParamSchema),
        async (c) => {
            const { portfolioId } = c.req.valid("param");
            const { portfolioService } = useCtx(c);

            try {
                const p = await portfolioService.getById(portfolioId);
                const holdings = await portfolioService.getHoldings(portfolioId);
                const portfolioValue = await portfolioService.getPortfolioValue(portfolioId);

                return c.json({ data: { portfolio: p, holdings, portfolioValue } });
            } catch (err) {
                return handleError(c, err);
            }
        },
    );

    app.post(
        "/api/v1/portfolio/buy",
        zValidator("json", tradeBodySchema),
        async (c) => {
            const { portfolioId, stockId, quantity, price } = c.req.valid("json");
            const { portfolioService } = useCtx(c);

            try {
                const result = await portfolioService.buy(portfolioId, stockId, quantity, price);
                return c.json({ data: result });
            } catch (err) {
                return handleError(c, err);
            }
        },
    );

    app.post(
        "/api/v1/portfolio/sell",
        zValidator("json", tradeBodySchema),
        async (c) => {
            const { portfolioId, stockId, quantity, price } = c.req.valid("json");
            const { portfolioService } = useCtx(c);

            try {
                const result = await portfolioService.sell(portfolioId, stockId, quantity, price);
                return c.json({ data: result });
            } catch (err) {
                return handleError(c, err);
            }
        },
    );

    app.get(
        "/api/v1/portfolio/:portfolioId/value",
        zValidator("param", portfolioIdParamSchema),
        async (c) => {
            const { portfolioId } = c.req.valid("param");
            const { portfolioService } = useCtx(c);

            try {
                const portfolioValue = await portfolioService.getPortfolioValue(portfolioId);
                return c.json({ data: { portfolioId, portfolioValue } });
            } catch (err) {
                return handleError(c, err);
            }
        },
    );
};
