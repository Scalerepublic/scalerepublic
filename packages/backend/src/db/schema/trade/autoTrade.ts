import {
    pgTable,
    text,
    integer,
    numeric,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

import { portfolio } from "../portfolio/portfolio";
import { stock } from "../stock/stock";

/**
 * ENUMS
 * Database-enforced value constraints for rule fields.
 */

export const autoTradeRuleTypeEnum = pgEnum("auto_trade_rule_type", [
    "BUY",
    "SELL",
]);

export const autoTradeRuleStatusEnum = pgEnum("auto_trade_rule_status", [
    /**
     * Rule is active and will be evaluated on each price tick.
     */
    "ACTIVE",

    /**
     * Rule fired once and has been fulfilled.
     * Rules are single-use by default to avoid runaway buying/selling.
     * If you want repeating rules, add a `is_repeating` boolean.
     */
    "TRIGGERED",

    /**
     * Manually cancelled by the user before it fired.
     */
    "CANCELLED",

    /**
     * Rule expired (past expires_at) without ever triggering.
     */
    "EXPIRED",
]);

/**
 * AUTO TRADE RULE MODULE 
 *
 * Stores price-threshold rules set by users, e.g.:
 *   "Buy 5 shares of GME if price ≤ $20.00"
 *   "Sell 10 shares of AAPL if price ≥ $210.00"
 *
 * Evaluation flow (handled by backend cron job):
 *   1. Every N minutes, fetch latest stock_price for all active stocks.
 *   2. Query all ACTIVE rules where the threshold condition is met.
 *   3. For each matched rule, attempt to execute a trade.
 *   4. On success → set status = TRIGGERED, store triggered_trade_id.
 *   5. On failure (e.g. insufficient funds) → leave ACTIVE or mark FAILED.
 */

export const autoTradeRule = pgTable(
    "auto_trade_rule",
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
         * BUY  → trigger when price ≤ price_threshold
         * SELL → trigger when price ≥ price_threshold
         */
        ruleType: autoTradeRuleTypeEnum("rule_type").notNull(),

        /**
         * Price in the stock's native currency at which the rule fires.
         * Compared against stock_price.price from the latest price tick.
         */
        priceThreshold: numeric("price_threshold", {
            precision: 18,
            scale: 4,
        }).notNull(),

        /**
         * Number of shares to buy or sell when the rule triggers.
         * Must be ≥ 1. Validated at the service layer before insert.
         */
        quantity: integer("quantity").notNull(),

        status: autoTradeRuleStatusEnum("status")
            .notNull()
            .default("ACTIVE"),

        /**
         * Optional: rule automatically expires at this time.
         * NULL means the rule stays active indefinitely.
         * The cron job sets status = EXPIRED when now() > expires_at.
         */
        expiresAt: timestamp("expires_at"),

        /**
         * Set when status transitions to TRIGGERED.
         * Links to the trade record that was created when the rule fired.
         * Nullable FK — not a hard reference to avoid circular dep issues.
         */
        triggeredTradeId: text("triggered_trade_id"),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        // Primary lookup: "find all active rules for a given stock"
        // Used by the cron job after each price tick.
        index("auto_trade_rule_stock_status_idx")
            .on(table.stockId, table.status),

        // Secondary lookup: "show user their own rules"
        index("auto_trade_rule_portfolio_id_idx")
            .on(table.portfolioId),
    ],
);

/**
 * Relations
 */

export const autoTradeRuleRelations = relations(
    autoTradeRule,
    ({ one }) => ({
        portfolio: one(portfolio, {
            fields: [autoTradeRule.portfolioId],
            references: [portfolio.id],
        }),

        stock: one(stock, {
            fields: [autoTradeRule.stockId],
            references: [stock.id],
        }),
    }),
);