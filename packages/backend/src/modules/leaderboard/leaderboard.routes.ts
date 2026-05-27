import { zValidator } from "@hono/zod-validator";

import { useCtx, type App } from "../../context.ts";

import { leaderboardQuerySchema } from "./leaderboard.schema.ts";

export const registerLeaderboardRoutes = (app: App) => {
  app.get(
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
};
