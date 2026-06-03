import { Hono } from "hono";

import { type App, type AppEnv, type AppVars } from "./context.ts";
import { auth } from "./lib/auth.ts";
import { isMarketDebugEnabled } from "./lib/market-debug.ts";
import { registerLeaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.ts";
import { registerMarketDebugRoutes } from "./modules/market-debug/index.ts";
import { registerPortfolioRoutes } from "./modules/portfolio/portfolio.routes.ts";
import { registerStockRoutes } from "./modules/stock/stock.routes.ts";
import { registerUserRoutes } from "./modules/user/user.routes.ts";

export const createApp = (ctx: AppVars): App => {
    const app = new Hono<AppEnv>();

    app.use(async (c, next) => {
        c.set("ctx", ctx);
        await next();
    });

    app.get("/health", (c) => c.json({ status: "ok" }));

    app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

    registerStockRoutes(app);
    registerUserRoutes(app);
    registerLeaderboardRoutes(app);
    registerPortfolioRoutes(app);

    if (isMarketDebugEnabled()) {
        registerMarketDebugRoutes(app);
    }

    if (process.env.NODE_ENV !== "test") {
        ctx.syncService.startScheduler().catch((err) => {
            console.error("[sync] Failed to start scheduler:", err);
        });
    }

    return app;
};

export type { ApiRoutesType } from "./api/index.ts";
