import { pgTable, text, timestamp, uuid, numeric, boolean } from 'drizzle-orm/pg-core'

/**
 * users table
 * Stores core authentication and financial identity of a user.
 * Each user represents a trader in the simulated stock exchange.
 */
export const users = pgTable('users', {

    id: uuid().primaryKey().defaultRandom(),

    username: text().notNull().unique(),

    email: text().notNull().unique(),

    // never store plain text passwords
    passwordHash: text().notNull(),

    // used for leaderboard baseline calculation
    startingCapital: numeric({ precision: 18, scale: 2 }).notNull(),

    // true -> user cannot execute trades anymore
    isDefaulted: boolean().notNull().default(false),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})