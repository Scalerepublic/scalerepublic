import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth-schema.ts";
import { exampleItems } from "./schema/example-items.ts";

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, {
  schema: {
    exampleItems,
    ...authSchema,
  },
  casing: "snake_case",
});

export type DbConnection = typeof db;

export * from "./schema/auth-schema.ts";
export * from "./schema/example-items.ts";
