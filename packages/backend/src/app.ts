import type { Fetcher } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { type App, type AppEnv, type AppVars, createAppContext, useCtx } from "./context.ts";
import { requireApiAuth } from "./lib/require-auth.ts";
import { createDb, type DbClient } from "./db/index.ts";
import { isMarketDebugEnabled } from "./lib/market-debug.ts";
import { UNI_API_PROXY_BASE_URL } from "./lib/uni-api-proxy.ts";
import { registerAuthRoutes } from "./modules/auth/auth.routes.ts";
import { registerAutoTradeRoutes } from "./modules/autotrade/autotrade.routes.ts";
import { registerLeaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.ts";
import { registerMarketDebugRoutes } from "./modules/market-debug/index.ts";
import { registerNotificationRoutes } from "./modules/notification/notification.routes.ts";
import { registerPortfolioRoutes } from "./modules/portfolio/portfolio.routes.ts";
import { registerStockRoutes } from "./modules/stock/stock.routes.ts";
import type { UniApiSubfetch } from "./modules/stockapi/uni-stock-client.ts";
import { registerUserRoutes } from "./modules/user/user.routes.ts";

/**
 * Bindings provided by the Cloudflare Worker runtime. `HYPERDRIVE` exposes the
 * pooled Postgres connection string; auth config arrives as secrets/vars.
 */
export type WorkerBindings = {
    HYPERDRIVE: { connectionString: string };
    UNI_API_PROXY?: Fetcher;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
};

const createUniApiSubfetch = (proxy: Fetcher | undefined): UniApiSubfetch | undefined => {
    if (proxy === undefined) {
        return undefined;
    }
    return (input: string | URL | Request, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        return proxy.fetch(request) as Promise<Response>;
    };
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
    const uniApiSubfetch = createUniApiSubfetch(env.UNI_API_PROXY);
    if (uniApiSubfetch === undefined) {
        const baseUrl = process.env['UNI_API_BASE_URL'] ?? '';
        if (/:\/\/\d{1,3}(?:\.\d{1,3}){3}/.test(baseUrl)) {
            console.warn('[uniapi] UNI_API_PROXY binding missing while UNI_API_BASE_URL points at an IP; fetches will fail on Workers');
        }
    }
    const ctx = createAppContext(db, {
        auth: {
            secret: env.BETTER_AUTH_SECRET,
            baseURL: env.BETTER_AUTH_URL,
        },
        uniApiSubfetch,
        uniApiBaseUrl: uniApiSubfetch !== undefined ? UNI_API_PROXY_BASE_URL : undefined,
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

    app.onError((err, c) => {
        if (err instanceof HTTPException) {
            return err.getResponse()
        }
        console.error(err)
        return c.json({ error: "Internal server error" }, 500)
    })

    app.get("/health", (c) => c.json({ status: "ok" }));

    app.on(["POST", "GET"], "/api/auth/*", (c) => useCtx(c).auth.handler(c.req.raw));

    app.use("/api/v1/*", requireApiAuth);

    registerAuthRoutes(app);
    registerStockRoutes(app);
    registerUserRoutes(app);
    registerLeaderboardRoutes(app);
    registerPortfolioRoutes(app);
    registerAutoTradeRoutes(app);
    registerNotificationRoutes(app);
    // Always registered: the /api/v1/market/clock endpoint must exist even when
    // market debug is disabled (it returns the real, non-simulated date). The
    // /api/v1/debug/* endpoints self-gate via requireMarketDebugOperator.
    registerMarketDebugRoutes(app);

    return app;
};

export type { ApiRoutesType } from "./api/index.ts";
