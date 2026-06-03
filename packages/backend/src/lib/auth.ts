import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db";
import { account, session, user, verification } from "../db/schema/auth-schema";

const authUrl = process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: authUrl ? [authUrl] : [],
  advanced: {
    useSecureCookies: authUrl?.startsWith("https://") ?? false,
  },
});
