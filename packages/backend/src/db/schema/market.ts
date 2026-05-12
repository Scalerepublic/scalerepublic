import { pgTable, uuid, timestamp, numeric, text } from 'drizzle-orm/pg-core'
import { stocks } from './stock'

/**
 * market table
 * Stores historical price data for each stock.
 * This is an append-only time series dataset.
 */
export const stockPrices = pgTable('stock_prices', {
    id: uuid().primaryKey().defaultRandom(),

    stockId: uuid()
        .notNull()
        .references(() => stocks.id),

    // market price at the recorded timestamp
    price: numeric({ precision: 18, scale: 4 }).notNull(),

    source: text().notNull(), // e.g. Yahoo Finance API

    recordedAt: timestamp({ withTimezone: true }).notNull(),
})