import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppContext, type AppEnv } from "../../context.ts";
import { getAuthSession, requirePortfolioOwnership } from "../../lib/require-auth.ts";
import { userIdParamSchema } from "../user/user.schema.ts";

import {
    InsufficientFundsError,
    InsufficientHoldingsError,
    NoActivePortfolioError,
    PortfolioDefaultedError,
    PortfolioNotFoundError,
    PriceMismatchError,
    StockPriceUnavailableError,
    UserSuspendedError,
} from "./errors.ts";
import { portfolioIdParamSchema, tradeBodySchema } from "./portfolio.schema.ts";
import { MAX_DEFAULT_STRIKES } from "./portfolio.services.ts";

const handleError = (c: AppContext, err: unknown) => {
    if (err instanceof PortfolioNotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof PortfolioDefaultedError) return c.json({ error: err.message }, 403);
    if (err instanceof UserSuspendedError) return c.json({ error: err.message }, 403);
    if (err instanceof InsufficientFundsError) return c.json({ error: err.message }, 422);
    if (err instanceof InsufficientHoldingsError) return c.json({ error: err.message }, 422);
    if (err instanceof StockPriceUnavailableError) return c.json({ error: err.message }, 422);
    if (err instanceof PriceMismatchError) return c.json({ error: err.message }, 409);
    if (err instanceof NoActivePortfolioError) return c.json({ error: err.message }, 404);
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
                const portfolioRow = await portfolioService.ensureForUser(userId);
                const portfolioId = portfolioRow.id;
                const holdings = await portfolioService.getHoldings(portfolioId);
                const stockIds = holdings.map((holding) => holding.stockId);
                const [latestPrices, tickers] = await Promise.all([
                    stockService.getLatestPricesByStockIds(stockIds),
                    stockService.getTickersByStockIds(stockIds),
                ]);

                let portfolioValue = 0;
                const enrichedHoldings = holdings.map((holding) => {
                    const currentPrice = latestPrices.get(holding.stockId) ?? null;
                    if (currentPrice !== null) {
                        portfolioValue += holding.quantity * currentPrice;
                    }

                    return {
                        stockId: holding.stockId,
                        ticker: tickers.get(holding.stockId) ?? holding.stockId,
                        quantity: holding.quantity,
                        avgCost: holding.avgCost,
                        currentPrice,
                        marketValue:
                            currentPrice !== null ? holding.quantity * currentPrice : null,
                    };
                });

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
            const denied = await requirePortfolioOwnership(c, portfolioId);
            if (denied) return denied;

            const { portfolioService } = useCtx(c);

            try {
                const p = await portfolioService.getById(portfolioId);
                const holdings = await portfolioService.getHoldings(portfolioId);
                const portfolioValue = await portfolioService.getPortfolioValue(portfolioId, holdings);

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
            const denied = await requirePortfolioOwnership(c, portfolioId);
            if (denied) return denied;

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
            const denied = await requirePortfolioOwnership(c, portfolioId);
            if (denied) return denied;

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
            const denied = await requirePortfolioOwnership(c, portfolioId);
            if (denied) return denied;

            const { portfolioService } = useCtx(c);

            try {
                const portfolioValue = await portfolioService.getPortfolioValue(portfolioId);
                return c.json({ data: { portfolioId, portfolioValue } });
            } catch (err) {
                return handleError(c, err);
            }
        },
    )
    .post("/api/v1/portfolio/default", async (c) => {
        const authSession = getAuthSession(c);
        if (!authSession) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const { portfolioService, portfolioDefaultService } = useCtx(c);
        const userId = authSession.user.id;

        try {
            const active = await portfolioService.getActiveForUser(userId);
            if (!active) {
                const defaultCount = await portfolioService.getDefaultCount(userId);
                if (defaultCount >= MAX_DEFAULT_STRIKES) {
                    throw new UserSuspendedError(userId);
                }
                throw new NoActivePortfolioError(userId);
            }

            await portfolioDefaultService.defaultPortfolio(active.id);

            const penaltyCounter = await portfolioService.getDefaultCount(userId);
            const nextActive = await portfolioService.getActiveForUser(userId);

            return c.json({
                data: {
                    penaltyCounter,
                    isSuspended: penaltyCounter >= MAX_DEFAULT_STRIKES,
                    activePortfolioId: nextActive?.id ?? null,
                },
            });
        } catch (err) {
            return handleError(c, err);
        }
    });

export const registerPortfolioRoutes = (app: App) => {
    app.route('/', portfolioRoutes)
}
