import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth-schema.ts";
import { userProfile } from "./schema/user-profile.ts";

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, {
  prepare: false,
  // Swallow "NOCICE" level postgres messages in test mode to reduce noise
  onnotice: process.env.NODE_ENV === "test" ? () => undefined : undefined,
});
export const db = drizzle(client, {
  schema: {
    userProfile,
    ...authSchema,
  },
  casing: "snake_case",
});

export type DbConnection = typeof db;
export type DbOrTx = typeof db | Parameters<Parameters<typeof db['transaction']>[0]>[0];

export * from "./schema/auth-schema.ts";
export * from "./schema/user-profile.ts";
