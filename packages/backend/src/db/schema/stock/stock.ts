import {
    pgTable,
    text,
    boolean,
    timestamp,
    index,
    numeric,
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

        periodChangePercent: numeric("period_change_percent", {
            precision: 10,
            scale: 4,
        }),

        dayChangePercent: numeric("day_change_percent", {
            precision: 10,
            scale: 4,
        }),

        metricsUpdatedAt: timestamp("metrics_updated_at", { withTimezone: true }),

        backfillRequestedAt: timestamp("backfill_requested_at", { withTimezone: true }),

        isActive: boolean("is_active")
            .default(true)
            .notNull(),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("stock_ticker_idx").on(table.ticker),
        index("stock_backfill_requested_at_idx").on(table.backfillRequestedAt),
    ],
);