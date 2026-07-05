import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";

import type { DbConnection } from "../db/index.ts";
import { account, session, user, verification } from "../db/schema/auth-schema.ts";

import { hashPassword, verifyPassword } from "./password.ts";
import { passwordSchema } from "./validation.ts";

export type Auth = ReturnType<typeof createAuth>;

export type AuthOptions = {
  secret?: string;
  baseURL?: string;
};

export const createAuth = (db: DbConnection, options: AuthOptions = {}) => {
  const secret = options.secret ?? process.env.BETTER_AUTH_SECRET;
  const rawBaseURL = options.baseURL ?? process.env.BETTER_AUTH_URL;
  const baseURL = rawBaseURL !== undefined && rawBaseURL !== "" ? rawBaseURL : undefined;

  return betterAuth({
    secret: secret !== undefined && secret !== "" ? secret : undefined,
    baseURL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // Default scrypt hashing exceeds the Cloudflare Workers per-request CPU
      // budget. Use a Web Crypto (PBKDF2) hasher that runs as native code.
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    trustedOrigins: baseURL !== undefined ? [baseURL] : [],
    advanced: {
      useSecureCookies: baseURL !== undefined ? baseURL.startsWith("https://") : false,
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email" && ctx.body) {
          const result = passwordSchema.safeParse((ctx.body as any).password);
          if (!result.success) {
            throw new APIError("BAD_REQUEST", {
              message: result.error.issues[0]?.message ?? "Invalid password",
            });
          }
        }
        if (ctx.path === "/change-password" && ctx.body) {
          const result = passwordSchema.safeParse((ctx.body as any).newPassword);
          if (!result.success) {
            throw new APIError("BAD_REQUEST", {
              message: result.error.issues[0]?.message ?? "Invalid password",
            });
          }
        }
      }),
    },
  });
};
