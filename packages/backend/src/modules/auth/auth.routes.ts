import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { type App, type AppEnv, useCtx } from "../../context.ts";

import { emailAvailableSchema, resetPasswordSchema } from "./auth.schema.ts";

export const authRoutes = new Hono<AppEnv>()
  .get(
    "/api/v1/auth/email-available",
    zValidator("query", emailAvailableSchema),
    async (c) => {
      const { email } = c.req.valid("query");
      const { auth } = useCtx(c);

      // better-auth's change-email intentionally reports success even when the
      // target email is already taken (to avoid leaking account existence). For
      // this demo we want explicit feedback, so we expose a simple lookup.
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(email);
      return c.json({ data: { available: found === null } });
    },
  )
  .post(
    "/api/v1/auth/reset-password",
    zValidator("json", resetPasswordSchema),
    async (c) => {
      const { email, newPassword } = c.req.valid("json");
      const { auth } = useCtx(c);

      // Direct password reset without an email service (demo only): look up the
      // user by email and overwrite their credential password. Mirrors the logic
      // better-auth uses internally in its token-based reset flow.
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(email);
      if (!found) {
        return c.json({ error: "No account found for that email" }, 404);
      }

      const hashed = await ctx.password.hash(newPassword);
      const accounts = await ctx.internalAdapter.findAccounts(found.user.id);
      if (!accounts.find((account) => account.providerId === "credential")) {
        await ctx.internalAdapter.createAccount({
          userId: found.user.id,
          providerId: "credential",
          accountId: found.user.id,
          password: hashed,
        });
      } else {
        await ctx.internalAdapter.updatePassword(found.user.id, hashed);
      }

      return c.json({ data: { success: true } });
    },
  );

export const registerAuthRoutes = (app: App) => {
  app.route("/", authRoutes);
};
