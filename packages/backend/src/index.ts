import { Hono } from "hono";

import { auth } from "./lib/auth.ts";
import { registerExampleRoutes } from "./modules/example/example.routes.ts";
import { registerStocksRoutes } from "./modules/stocks/stocks.routes.ts";

export const createApp = () => {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  registerExampleRoutes(app);
  registerStocksRoutes(app);

  return app;
};

const app = createApp();

export { app };

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
  hostname: "0.0.0.0",
};
