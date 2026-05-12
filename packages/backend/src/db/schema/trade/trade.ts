import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

import { portfolio } from "../portfolio/portfolio";
import { stock } from "../stock/stock";

/**
 * ENUMS
 * Database-enforced value constraints for trade fields.
 */

export const tradeTypeEnum = pgEnum("trade_type", [
  "BUY",
  "SELL",
]);

export const tradeStatusEnum = pgEnum("trade_status", [
  /**
   * Trade has been created but not yet executed.
   * Waiting for confirmation or market conditions.
   */
  "PENDING",

  /**
   * Trade has been successfully executed.
   * executedAt and executedPrice are set.
   */
  "EXECUTED",

  /**
   * Trade failed due to insufficient funds, market halt,
   * or other execution errors.
   */
  "FAILED",

  /**
   * User manually cancelled before execution.
   */
  "CANCELLED",
]);

/**
 * TRADE MODULE
 * Immutable ledger of all trading operations.
 *
 * Design principles:
 * - Append-only: trades are never updated once EXECUTED.
 * - Atomic with portfolio updates: each trade execution must
 *   update portfolio.cashBalance and holding.quantity in a
 *   single database transaction.
 */

export const trade = pgTable(
  "trade",
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

    tradeType: tradeTypeEnum("trade_type").notNull(),

    /**
     * Number of shares involved in this trade.
     * Always positive — direction is determined by tradeType.
     */
    quantity: integer("quantity").notNull(),

    /**
     * Price per share at which the trade was executed.
     * For PENDING trades, this is the *intended* price.
     * For EXECUTED trades, this is the *actual* price from stock_price.
     */
    executedPrice: numeric("executed_price", {
      precision: 18,
      scale: 4,
    }).notNull(),

    status: tradeStatusEnum("status")
      .notNull()
      .default("PENDING"),

    /**
     * Timestamp when the trade status changed to EXECUTED.
     * NULL for PENDING/FAILED/CANCELLED trades.
     */
    executedAt: timestamp("executed_at"),

    /**
     * If this trade was triggered by an auto_trade_rule,
     * store the rule ID here for audit trail.
     * NULL for manual trades.
     */
    autoTradeRuleId: text("auto_trade_rule_id"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Primary lookup: "all trades for a portfolio"
    index("trade_portfolio_id_idx")
      .on(table.portfolioId),

    // Secondary lookup: "all trades for a stock" (analytics)
    index("trade_stock_id_idx")
      .on(table.stockId),

    // Time-series queries: "recent trades", "trades in date range"
    index("trade_created_at_idx")
      .on(table.createdAt),

    // Performance: "show only executed trades"
    index("trade_status_idx")
      .on(table.status),
  ],
);

/**
 * Relations
 */

export const tradeRelations = relations(
  trade,
  ({ one }) => ({
    portfolio: one(portfolio, {
      fields: [trade.portfolioId],
      references: [portfolio.id],
    }),

    stock: one(stock, {
      fields: [trade.stockId],
      references: [stock.id],
    }),
  }),
);