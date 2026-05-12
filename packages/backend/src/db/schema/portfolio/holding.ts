import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { stock } from "../stock/stock";

import { portfolio } from "./portfolio";

/**
 * HOLDING MODULE
 *
 * Tracks the *current* stock positions of each portfolio.
 * This is a materialised summary of all executed trades —
 * updated via upsert every time a trade is executed.
 *
 * Why this table exists:
 * - Net worth calculation (Req 5, leaderboard) needs current
 *   holdings without scanning the entire trade ledger.
 * - Historic portfolio view (Req 7) can be reconstructed from
 *   trades, but current state lives here for performance.
 *
 * Invariants:
 * - One row per (portfolio_id, stock_id) pair.
 * - quantity = 0 means position is closed (row kept for history).
 * - avg_cost is recalculated on every BUY via weighted average.
 *   It does NOT change on SELL (standard accounting convention).
 */

export const holding = pgTable(
  "holding",
  {
    id: text("id").primaryKey(),

    // FK → portfolio.id
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, {
        onDelete: "cascade",
      }),

    // FK → stock.id
    stockId: text("stock_id")
      .notNull()
      .references(() => stock.id, {
        onDelete: "cascade",
      }),

    /**
     * Current number of shares held.
     * Set to 0 when fully sold — do NOT delete the row,
     * as it may be useful for audit / history queries.
     */
    quantity: integer("quantity").notNull().default(0),

    /**
     * Volume-weighted average purchase price.
     * Formula on each BUY:
     *   new_avg = (old_qty * old_avg + bought_qty * price) / (old_qty + bought_qty)
     *
     * Stays unchanged on SELL.
     */
    avgCost: numeric("avg_cost", {
      precision: 18,
      scale: 4,
    }),

    // Timestamp of the last trade that touched this holding
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Enforces one row per user+stock combination
    uniqueIndex("holding_portfolio_stock_uniq")
      .on(table.portfolioId, table.stockId),

    // Used in leaderboard queries: "all holdings for portfolio X"
    index("holding_portfolio_id_idx")
      .on(table.portfolioId),
  ],
);

/**
 * Relations
 */

export const holdingRelations = relations(
  holding,
  ({ one }) => ({
    portfolio: one(portfolio, {
      fields: [holding.portfolioId],
      references: [portfolio.id],
    }),

    stock: one(stock, {
      fields: [holding.stockId],
      references: [stock.id],
    }),
  }),
);