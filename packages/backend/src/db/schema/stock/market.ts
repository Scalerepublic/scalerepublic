import {
  pgTable,
  text,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

import { stock } from "./stock";

/**
 * MARKET DATA MODULE
 * Stores historical stock prices.
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

    price: numeric("price", {
      precision: 18,
      scale: 4,
    }).notNull(),

    // data provider, e.g. Yahoo Finance
    source: text("source")
      .notNull(),


    recordedAt: timestamp("recorded_at")
      .notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_price_stock_id_idx")
      .on(table.stockId),

    index("stock_price_recorded_at_idx")
      .on(table.recordedAt),
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