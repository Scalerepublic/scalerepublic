import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { LeaderboardService } from "./leaderboard.service.ts";
import { leaderboardQuerySchema } from "./leaderboard.schema.ts";

const leaderboardService = new LeaderboardService();

export const registerLeaderboardRoutes = (app: Hono) => {
    //gibt das Leaderboard aus
  app.get(
    "/api/v1/leaderboard",
    zValidator("query", leaderboardQuerySchema),
    async (c) => {
      const { limit } = c.req.valid("query");

      const leaderboard = await leaderboardService.getLeaderboard();

      return c.json({
        data: leaderboard.slice(0, limit),
      });
    },
  );
};