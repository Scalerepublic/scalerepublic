import {
    pgTable,
    text,
    boolean,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

/**
 * STOCK MODULE
 * Static metadata for tradable stocks.
 */

export const stock = pgTable(
    "stock",
    {
        // FK -> stock.id
        id: text("id").primaryKey(),

        // Public ticker symbol, e.g. AAPL, TSLA
        ticker: text("ticker")
            .notNull()
            .unique(),

        // Full company name 
        companyName: text("company_name")
            .notNull(),

        exchange: text("exchange")
            .notNull(),

        currency: text("currency")
            .notNull(),

        description: text("description"),

        isAccumulating: boolean("is_accumulating"),

        isActive: boolean("is_active")
            .default(true)
            .notNull(),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("stock_ticker_idx").on(table.ticker),
    ],
);