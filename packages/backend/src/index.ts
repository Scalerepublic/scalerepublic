import { Hono } from "hono";

import { auth } from "./lib/auth.ts";
import { registerLeaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.ts";
import { registerStockRoutes } from "./modules/stock/stock.routes.ts";
import { registerUserRoutes } from "./modules/user/user.routes.ts";

export const createApp = () => {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  registerStockRoutes(app);
  registerUserRoutes(app);
  registerLeaderboardRoutes(app);

  return app;
};

const app = createApp();

export { app };

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
  hostname: "0.0.0.0",
};
