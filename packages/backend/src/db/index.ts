import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth-schema.ts";
import { userProfile } from "./schema/user-profile.ts";

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, {
  schema: {
    userProfile,
    ...authSchema,
  },
  casing: "snake_case",
});

export type DbConnection = typeof db;

export * from "./schema/auth-schema.ts";
export * from "./schema/user-profile.ts";
