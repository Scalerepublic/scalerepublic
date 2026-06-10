import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppEnv } from "../../context.ts";

import { leaderboardQuerySchema } from "./leaderboard.schema.ts";

export const leaderboardRoutes = new Hono<AppEnv>()
  .get(
    "/api/v1/leaderboard",
    zValidator("query", leaderboardQuerySchema),
    async (c) => {
      const { limit } = c.req.valid("query");
      const { leaderboardService } = useCtx(c);

      const leaderboard = await leaderboardService.getLeaderboard();

      return c.json({
        data: leaderboard.slice(0, limit),
      });
    },
  );

export const registerLeaderboardRoutes = (app: App) => {
  app.route('/', leaderboardRoutes)
}
