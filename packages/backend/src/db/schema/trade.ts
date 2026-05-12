import { pgTable, uuid, timestamp, numeric, integer, text } from 'drizzle-orm/pg-core'
import { portfolios } from './portfolio'
import { stocks } from './stock'

/**
 * trades table
 * Immutable financial ledger of all BUY/SELL operations.
 * Acts as the source of truth for portfolio reconstruction.
 */
export const trades = pgTable('trades', {
    id: uuid().primaryKey().defaultRandom(),

    portfolioId: uuid()
        .notNull()
        .references(() => portfolios.id),

    stockId: uuid()
        .notNull()
        .references(() => stocks.id),

    tradeType: text().notNull(), // BUY / SELL

    quantity: integer().notNull(),

    executedPrice: numeric({ precision: 18, scale: 4 }).notNull(),

    status: text().notNull(), // PENDING / EXECUTED / FAILED

    executedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})