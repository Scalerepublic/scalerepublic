import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { PortfolioService } from "./portfolio.services.ts";
import { tradeBodySchema, userIdParamSchema } from "./portfolio.schema.ts";

const portfolioService = new PortfolioService();
export const registerPortfolioRoutes = (app: Hono) => {
  app.get(
    "/api/v1/portfolio/:userId",
    zValidator("param", userIdParamSchema),
    async (c) => {
      const { userId } = c.req.valid("param");

      const portfolio = await portfolioService.getPortfolioByUserId(userId);
      const holdings = await portfolioService.getHoldingsByUserId(userId);
      const portfolioValue = await portfolioService.getPortfolioValue(userId);

      return c.json({
        data: {
          portfolio,
          holdings,
          portfolioValue,
        },
      });
    },
  );

  app.post(
    "/api/v1/portfolio/buy",
    zValidator("json", tradeBodySchema),
    async (c) => {
      const { userId, stockId, quantity } = c.req.valid("json");

      const result = await portfolioService.buyStock(userId, stockId, quantity);

      return c.json({ data: result });
    },
  );

  app.post(
    "/api/v1/portfolio/sell",
    zValidator("json", tradeBodySchema),
    async (c) => {
      const { userId, stockId, quantity } = c.req.valid("json");

      const result = await portfolioService.sellStock(userId, stockId, quantity);

      return c.json({ data: result });
    },
  );

  app.get(
    "/api/v1/portfolio/:userId/value",
    zValidator("param", userIdParamSchema),
    async (c) => {
      const { userId } = c.req.valid("param");

      const portfolioValue = await portfolioService.getPortfolioValue(userId);

      return c.json({
        data: {
          userId,
          portfolioValue,
        },
      });
    },
  );
};