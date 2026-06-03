import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppContext, type AppEnv } from "../../context.ts";
import { userIdParamSchema } from "../user/user.schema.ts";

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

export const portfolioRoutes = new Hono<AppEnv>()
    .get(
        "/api/v1/users/:id/portfolio",
        zValidator("param", userIdParamSchema),
        async (c) => {
            const { id: userId } = c.req.valid("param");
            const { portfolioService, stockService } = useCtx(c);

            try {
                const portfolios = await portfolioService.getByUserId(userId);
                const portfolioRow = portfolios[0];
                if (!portfolioRow) {
                    return c.json({ error: "Portfolio not found" }, 404);
                }

                const portfolioId = portfolioRow.id;
                const holdings = await portfolioService.getHoldings(portfolioId);
                const portfolioValue = await portfolioService.getPortfolioValue(portfolioId);

                const enrichedHoldings = await Promise.all(
                    holdings.map(async (h) => {
                        const [ticker, currentPrice] = await Promise.all([
                            stockService.getTicker(h.stockId),
                            stockService.getLatestPriceByStockId(h.stockId),
                        ]);
                        return {
                            stockId: h.stockId,
                            ticker: ticker ?? h.stockId,
                            quantity: h.quantity,
                            avgCost: h.avgCost,
                            currentPrice,
                            marketValue:
                                currentPrice !== null ? h.quantity * currentPrice : null,
                        };
                    }),
                );

                return c.json({
                    data: {
                        portfolio: portfolioRow,
                        holdings: enrichedHoldings,
                        portfolioValue,
                    },
                });
            } catch (err) {
                return handleError(c, err);
            }
        },
    )
    .get(
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
    )
    .post(
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
    )
    .post(
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
    )
    .get(
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

export const registerPortfolioRoutes = (app: App) => {
    app.route('/', portfolioRoutes)
}
