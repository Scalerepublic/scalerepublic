import { Hono } from "hono";

import { type App, type AppEnv, type AppVars, createAppContext, useCtx } from "./context.ts";
import { createDb, type DbClient } from "./db/index.ts";
import { isMarketDebugEnabled } from "./lib/market-debug.ts";
import { registerLeaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.ts";
import { registerMarketDebugRoutes } from "./modules/market-debug/index.ts";
import { registerPortfolioRoutes } from "./modules/portfolio/portfolio.routes.ts";
import { registerStockRoutes } from "./modules/stock/stock.routes.ts";
import { registerUserRoutes } from "./modules/user/user.routes.ts";

/**
 * Bindings provided by the Cloudflare Worker runtime. `HYPERDRIVE` exposes the
 * pooled Postgres connection string; auth config arrives as secrets/vars.
 */
export type WorkerBindings = {
    HYPERDRIVE: { connectionString: string };
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
};

const hasConnectionString = (env: unknown): env is WorkerBindings =>
    typeof (env as Partial<WorkerBindings> | undefined)?.HYPERDRIVE?.connectionString === "string"
    && (env as WorkerBindings).HYPERDRIVE.connectionString !== "";

/**
 * Builds a fresh application context (DB connection, better-auth, services)
 * from the Worker environment. A new Postgres client is created per call:
 * Cloudflare Workers forbid reusing an I/O object (DB connection) across
 * requests, and Hyperdrive pools the underlying connections so this is cheap.
 * The caller is responsible for closing the returned `client`.
 */
export const createWorkerContext = (env: WorkerBindings): { ctx: AppVars; client: DbClient } => {
    const { db, client } = createDb(env.HYPERDRIVE.connectionString);
    const ctx = createAppContext(db, {
        auth: {
            secret: env.BETTER_AUTH_SECRET,
            baseURL: env.BETTER_AUTH_URL,
        },
    });
    return { ctx, client };
};

// Singleton context for the local Bun runtime (DATABASE_URL). Reusing a
// connection across requests is fine outside the Workers runtime.
let bunCtx: AppVars | undefined;

export const createApp = (staticCtx?: AppVars): App => {
    const app = new Hono<AppEnv>();

    app.use(async (c, next) => {
        let ctx: AppVars;
        let client: DbClient | undefined;

        if (staticCtx) {
            ctx = staticCtx;
        } else if (hasConnectionString(c.env)) {
            // Cloudflare Workers: one DB connection per request, closed after.
            ({ ctx, client } = createWorkerContext(c.env));
        } else {
            // Local Bun runtime: reuse a singleton ctx.
            ctx = bunCtx ??= createAppContext();
        }

        c.set("ctx", ctx);

        try {
            // Load the persisted simulated-market clock before handling the
            // request (the service instance is per-request on Workers).
            if (isMarketDebugEnabled()) {
                await ctx.marketDebugService.loadState();
            }
            await next();
        } finally {
            if (client) {
                c.executionCtx.waitUntil(client.end());
            }
        }
    });

    app.get("/health", (c) => c.json({ status: "ok" }));

    app.on(["POST", "GET"], "/api/auth/*", (c) => useCtx(c).auth.handler(c.req.raw));

    registerStockRoutes(app);
    registerUserRoutes(app);
    registerLeaderboardRoutes(app);
    registerPortfolioRoutes(app);
    // Always registered: the /api/v1/market/clock endpoint must exist even when
    // market debug is disabled (it returns the real, non-simulated date). The
    // /api/v1/debug/* endpoints self-gate via requireMarketDebugOperator.
    registerMarketDebugRoutes(app);

    return app;
};

export type { ApiRoutesType } from "./api/index.ts";
