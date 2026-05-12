import { pgTable, uuid, timestamp, numeric } from 'drizzle-orm/pg-core'

import { users } from './user'

/**
 * portfolios table
 * Represents the financial account of a user.
 * Stores current cash balance and links to holdings/trades.
 */
export const portfolios = pgTable('portfolios', {
    id: uuid().primaryKey().defaultRandom(),

    // one portfolio to one user
    userId: uuid()
        .notNull()
        .references(() => users.id)
        .unique(),

    // updated after each BUY/SELL operation
    cashBalance: numeric({ precision: 18, scale: 2 }).notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})