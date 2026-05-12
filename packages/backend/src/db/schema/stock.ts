import { pgTable, text, uuid, boolean } from 'drizzle-orm/pg-core'

/**
 * stocks table
 * Stores metadata about tradable assets (companies).
 * This is static reference data (rarely changes).
 */
export const stocks = pgTable('stocks', {
    id: uuid().primaryKey().defaultRandom(),

    ticker: text().notNull().unique(), // AAPL, TSLA...

    companyName: text().notNull(), //full name 

    exchange: text().notNull(),
    
    currency: text().notNull(),

    isActive: boolean().notNull().default(true),
})