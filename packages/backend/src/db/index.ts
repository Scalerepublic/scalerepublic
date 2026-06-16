import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth-schema.ts";
import { userProfile } from "./schema/user-profile.ts";

const schema = {
  userProfile,
  ...authSchema,
};

export type DbConnection = ReturnType<typeof createDb>["db"];
export type DbClient = ReturnType<typeof createDb>["client"];
export type DbOrTx =
  | DbConnection
  | Parameters<Parameters<DbConnection["transaction"]>[0]>[0];

export const createDb = (connectionString: string) => {
  const client = postgres(connectionString, {
    // Hyperdrive does not cache prepared statements; keeping this false also
    // avoids the intermittent "prepared statement does not exist" errors.
    prepare: false,
    // No array/custom types in the schema, so skip the type-discovery round-trip.
    fetch_types: false,
    // Stay within the Workers per-request external connection limit.
    max: 5,
    // Swallow "NOTICE" level postgres messages in test mode to reduce noise.
    onnotice: process.env.NODE_ENV === "test" ? () => undefined : undefined,
  });
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  });
  return { db, client };
};

// Singleton used by local Bun runtime and tests. On Cloudflare Workers the
// connection string comes from the Hyperdrive binding instead (see app.ts), so
// this is intentionally not created when DATABASE_URL is absent.
const connectionString = process.env.DATABASE_URL;
const singleton = connectionString ? createDb(connectionString) : undefined;

export const db = singleton?.db as DbConnection;
export const client = singleton?.client as DbClient;

export * from "./schema/auth-schema.ts";
export * from "./schema/user-profile.ts";
