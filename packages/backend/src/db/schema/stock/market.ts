import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  numeric,
  timestamp,
  integer,
  index,
  uniqueIndex,
  date,
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

export const stockDailyBar = pgTable(
  "stock_daily_bar",
  {
    id: text("id").primaryKey(),

    stockId: text("stock_id")
      .notNull()
      .references(() => stock.id, {
        onDelete: "cascade",
      }),

    tradingDate: date("trading_date").notNull(),

    open: numeric("open", { precision: 18, scale: 4 }).notNull(),
    high: numeric("high", { precision: 18, scale: 4 }).notNull(),
    low: numeric("low", { precision: 18, scale: 4 }).notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),

    source: text("source").notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_daily_bar_stock_date_uniq")
      .on(table.stockId, table.tradingDate),
    index("stock_daily_bar_stock_id_idx")
      .on(table.stockId),
  ],
);

export const stockDailyBarRelations = relations(
  stockDailyBar,
  ({ one }) => ({
    stock: one(stock, {
      fields: [stockDailyBar.stockId],
      references: [stock.id],
    }),
  }),
);

/**
 * MARKET STATE (simulated/debug market)
 *
 * Single-row table holding the simulated market clock used by
 * MarketDebugService. It is persisted (rather than kept in memory) because the
 * backend runs on Cloudflare Workers, where each request gets a fresh,
 * stateless context — in-memory state would not survive between requests.
 */
export const marketState = pgTable("market_state", {
  id: text("id").primaryKey(),
  dayOffset: integer("day_offset").notNull().default(0),
  ticksOnCurrentDay: integer("ticks_on_current_day").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});