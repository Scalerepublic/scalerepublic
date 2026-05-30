import { Hono } from "hono";

import { createAppContext, type App, type AppEnv } from "./context.ts";
import { auth } from "./lib/auth.ts";
import { registerLeaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.ts";
import { registerPortfolioRoutes } from "./modules/portfolio/portfolio.routes.ts";
import { registerStockRoutes } from "./modules/stock/stock.routes.ts";
import { registerUserRoutes } from "./modules/user/user.routes.ts";

export const createApp = (): App => {
  const ctx = createAppContext();
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

  ctx.syncService.startScheduler().catch((err) => {
    console.error("[sync] Failed to start scheduler:", err);
  });

  return app;
};

const app = createApp();

export { app };

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
  hostname: "0.0.0.0",
};
