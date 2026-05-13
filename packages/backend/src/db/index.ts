import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * DATABASE CONNECTION LAYER
 *
 * This module is responsible for:
 * - Creating PostgreSQL connection
 * - Initializing Drizzle ORM
 * - Exposing typed database client
 */

const connectionString = process.env.DATABASE_URL;

// avoid silent crash
if (!connectionString) {
  throw new Error(
    "❌ DATABASE_URL is not defined in environment variables"
  );
}

export const client = postgres(connectionString, {
  prepare: false,  // improves compatibility with Drizzle
});

export const db = drizzle(client, {
  schema,
  casing: "snake_case",
});

// a type helper for services layer
export type DbConnection = typeof db;

// optional, a shutdown helper for deployment
export const closeDb = async () => {
  await client.end();
};