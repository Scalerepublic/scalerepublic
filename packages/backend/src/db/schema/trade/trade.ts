import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

import { portfolio } from "../portfolio/portfolio";
import { stock } from "../stock/stock";

/**
 * TRADE MODULE
 * Immutable ledger of all trading operations.
 */

export const trade = pgTable(
  "trade",
  {
    id: text("id").primaryKey(),

    // FK -> portfolio.id
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, {
        onDelete: "cascade",
      }),

    // FK -> stock.id
    stockId: text("stock_id")
      .notNull()
      .references(() => stock.id, {
        onDelete: "cascade",
      }),

    // BUY / SELL
    tradeType: text("trade_type")
      .notNull(),

    quantity: integer("quantity")
      .notNull(),

    executedPrice: numeric("executed_price", {
      precision: 18,
      scale: 4,
    }).notNull(),

    // PENDING / EXECUTED / FAILED
    status: text("status")
      .notNull(),

    executedAt: timestamp("executed_at"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("trade_portfolio_id_idx")
      .on(table.portfolioId),

    index("trade_stock_id_idx")
      .on(table.stockId),

    index("trade_created_at_idx")
      .on(table.createdAt),
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