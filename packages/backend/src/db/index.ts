import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { exampleItems } from './schema/example-items.ts'
import { userProfile } from "./schema/user-profile.ts";

const connectionString = process.env.DATABASE_URL!

export const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, {
    schema: { exampleItems,
        userProfile,
     },
    casing: 'snake_case',
})

export type DbConnection = typeof db

export * from './schema/example-items.ts'
export * from "./schema/user-profile.ts";
