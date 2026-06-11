import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { stock } from "./stock";

/**
 * MARKET DATA MODULE
 * Stores historical stock prices.
 *
 * Data sources:
 * - Real-time: Yahoo Finance API (Req 2)
 * - Test data: Manually seeded crash/rally scenarios (Req 3)
 *
 * Indexing strategy:
 * - Queries are typically "get latest price for stock X" or
 *   "price history for stock X between dates Y and Z".
 * - Primary index: (stock_id, recorded_at) — also enforces uniqueness.
 */

export const stockPrice = pgTable(
  "stock_price",
  {
    id: text("id").primaryKey(),

    stockId: text("stock_id")
      .notNull()
      .references(() => stock.id, {
        onDelete: "cascade",
      }),

    /**
     * Price in the stock's native currency at this point in time.
     * Matches the precision required for fractional share trading.
     */
    price: numeric("price", {
      precision: 18,
      scale: 4,
    }).notNull(),

    /**
     * Data provider identifier.
     * Examples: "yahoo_finance", "manual_seed", "test_crash_scenario"
     *
     * Allows filtering out test data in production queries if needed.
     */
    source: text("source").notNull(),

    /**
     * The real-world timestamp this price was recorded.
     * For hourly data (Req 2), this is the top of the hour.
     *
     * IMPORTANT: Must be in UTC to avoid timezone issues.
     */
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull(),

    /**
     * When this row was inserted into our database.
     * Different from recordedAt — used for audit / sync tracking.
     */
    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [
    /**
     * Ensures no duplicate price entries for the same stock at the same time.
     * Also serves as a composite index for time-range queries.
     */
    uniqueIndex("stock_price_stock_recorded_uniq")
      .on(table.stockId, table.recordedAt),

    /**
     * Secondary index for global time-series queries across all stocks.
     * Example: "all price updates in the last hour"
     */
    index("stock_price_recorded_at_idx")
      .on(table.recordedAt),

    /**
     * Allows filtering by data source, e.g. exclude test data.
     */
    index("stock_price_source_idx")
      .on(table.source),
  ],
);

/**
 * Relations
 */

export const stockPriceRelations = relations(
  stockPrice,
  ({ one }) => ({
    stock: one(stock, {
      fields: [stockPrice.stockId],
      references: [stock.id],
    }),
  }),
);