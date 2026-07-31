/**
 * Purpose: Serve user search, public profile, performance, net-worth, and deletion endpoints.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppEnv } from "../../context.ts";
import { requireAuth } from "../../lib/require-auth.ts";

import { searchQuerySchema, userIdParamSchema, performanceQuerySchema, deleteAccountBodySchema } from "./user.schema.ts";

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
  .get("/api/v1/users/:id/performance", zValidator("param", userIdParamSchema), zValidator("query", performanceQuerySchema), async (c) => {
    const { id } = c.req.valid("param");
    const { granularity } = c.req.valid("query");
    const { userService } = useCtx(c);
    const profile = await userService.getUserProfile(id);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    const performance = await userService.getUserPerformance(id, granularity);
    return c.json({ data: performance });
  })
  .delete("/api/v1/users/:id", zValidator("param", userIdParamSchema), zValidator("json", deleteAccountBodySchema), async (c) => {
    const authResult = await requireAuth(c);

    const { id } = c.req.valid("param");
    const { password } = c.req.valid("json");
    if (authResult.user.id !== id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { userService } = useCtx(c);
    const passwordValid = await userService.verifyPassword(id, password);
    if (!passwordValid) {
      return c.json({ error: "Incorrect password" }, 401);
    }

    const success = await userService.deleteAccount(id);
    if (!success) {
      return c.json({ error: "Failed to delete account" }, 500);
    }
    return c.json({ data: { userId: id, deleted: true } });
  });

export const registerUserRoutes = (app: App) => {
  app.route('/', userRoutes)
}
