import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppEnv } from "../../context.ts";

import { searchQuerySchema, userIdParamSchema } from "./user.schema.ts";

export const userRoutes = new Hono<AppEnv>()
  .get("/api/v1/users/search", zValidator("query", searchQuerySchema), async (c) => {
    const { q, limit } = c.req.valid("query");
    const { userService } = useCtx(c);
    const results = await userService.searchUsers(q, limit);
    return c.json({ data: results });
  })
  .get("/api/v1/users/:id", zValidator("param", userIdParamSchema), async (c) => {
    const {id} = c.req.valid("param");
    const { userService } = useCtx(c);
    const userProfile = await userService.getUserProfile(id);
    if (!userProfile) {
      return c.json({error: "User not found"}, 404);
    }
    return c.json({ data: userProfile});
  })
  .get("/api/v1/users/:id/net-worth", zValidator("param", userIdParamSchema), async (c) => {
    const { id} = c.req.valid("param");
    const { userService } = useCtx(c);
    const netWorth = await userService.getUserNetworth(id);
    return c.json({
      data: {
        userId: id,
        netWorth,
      },
    });
  })
  .get("/api/v1/users/:id/performance", zValidator("param", userIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const { userService } = useCtx(c);
    const profile = await userService.getUserProfile(id);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    const performance = await userService.getUserPerformance(id);
    return c.json({ data: performance });
  });

export const registerUserRoutes = (app: App) => {
  app.route('/', userRoutes)
}
