import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { DbConnection } from "../db/index.ts";
import { account, session, user, verification } from "../db/schema/auth-schema.ts";

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
  });
};
