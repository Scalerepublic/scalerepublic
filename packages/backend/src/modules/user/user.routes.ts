import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppEnv } from "../../context.ts";

import { userIdParamSchema } from "./user.schema.ts";

export const userRoutes = new Hono<AppEnv>()
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
  });

export const registerUserRoutes = (app: App) => {
  app.route('/', userRoutes)
}
