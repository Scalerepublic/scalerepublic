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

// Avoid silent crash
if (connectionString === null || connectionString === undefined || connectionString === "") {
  throw new Error(
    "❌ DATABASE_URL is not defined in environment variables"
  );
}

export const client = postgres(connectionString, {
  prepare: false,  // Improves compatibility with Drizzle
});

export const db = drizzle(client, {
  schema,
  casing: "snake_case",
});

// A type helper for services layer
export type DbConnection = typeof db;

// Optional, a shutdown helper for deployment
export const closeDb = async () => {
  await client.end();
};