import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth-schema.ts";
import * as notificationSchema from "./schema/notification.ts";
import * as portfolioSchema from "./schema/portfolio/index.ts";
import * as stockSchema from "./schema/stock/index.ts";
import { syncJob } from "./schema/sync.ts";
import * as tradeSchema from "./schema/trade/index.ts";
import { userProfile } from "./schema/user-profile.ts";

const schema = {
  userProfile,
  ...authSchema,
  ...notificationSchema,
  ...stockSchema,
  ...portfolioSchema,
  ...tradeSchema,
  syncJob,
};

export type DbConnection = ReturnType<typeof createDb>["db"];
export type DbClient = ReturnType<typeof createDb>["client"];
export type DbTransaction = Parameters<Parameters<DbConnection["transaction"]>[0]>[0];
export type DbOrTx = DbConnection | DbTransaction;

export const createDb = (connectionString: string) => {
  const client = postgres(connectionString, {
    prepare: false,
    fetch_types: false,
    max: 5,
    onnotice: process.env.NODE_ENV === "test" ? () => undefined : undefined,
  });
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  });
  return { db, client };
};

const connectionString = process.env.DATABASE_URL;
const singleton =
    typeof connectionString === "string" && connectionString.length > 0
        ? createDb(connectionString)
        : undefined;

export const db = singleton?.db as DbConnection;
export const client = singleton?.client as DbClient;

export * from "./schema/auth-schema.ts";
export * from "./schema/user-profile.ts";
