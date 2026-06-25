import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    numeric,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";

import { user } from "../auth-schema";

/**
 * ENUMS
 */

export const portfolioStatusEnum = pgEnum("portfolio_status", [
    /**
     * Normal operating state.
     * User can trade, appears on leaderboard.
     */
    "ACTIVE",

    /**
     * User's net worth dropped below the minimum threshold (Req 6).
     *
     * Default process:
     *   1. Cron job calculates net worth = cash + sum(holding * latest_price).
     *   2. If net worth < MIN_NET_WORTH_THRESHOLD, portfolio is marked DEFAULTED.
     *   3. All open auto_trade_rules are CANCELLED.
     *   4. User cannot place new trades.
     *   5. User appears on leaderboard with a "Defaulted" badge.
     *   6. User can be "reset" by an admin or via a defined re-entry process.
     *
     * What counts as "too low to do anything meaningful" is a product
     * decision — recommended: < $1.00 net worth, or < cost of cheapest
     * available stock. Define MIN_NET_WORTH_THRESHOLD in your config.
     */
    "DEFAULTED",
]);

/**
 * PORTFOLIO MODULE
 * Stores the financial account state of each user.
 */

export const portfolio = pgTable(
    "portfolio",
    {
        id: text("id").primaryKey(),

        userId: text("user_id")
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
            }),

        /**
        * Liquid cash currently available for trading.
        *
        * Updated atomically whenever a trade is executed.
        * Does NOT include stock holdings value.
        */
        cashBalance: numeric("cash_balance", {
            precision: 18,
            scale: 2,
        }).notNull(),

        /**
         * Starting capital assigned at registration (Req 5).
         * Stored for reference so leaderboard can show total gain/loss %.
         * Set once at portfolio creation, never updated.
         */
        startingCapital: numeric("starting_capital", {
            precision: 18,
            scale: 2,
        }).notNull(),

        status: portfolioStatusEnum("status")
            .notNull()
            .default("ACTIVE"),

        /**
         * Set when status transitions to DEFAULTED.
         * NULL while portfolio is ACTIVE.
         */
        defaultedAt: timestamp("defaulted_at"),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),

    },
    (table) => [
        index("portfolio_user_id_idx").on(table.userId),
        index("portfolio_user_id_status_idx").on(table.userId, table.status),
        index("portfolio_status_idx").on(table.status),
    ],
);

/**
 * Relations
 */

export const portfolioRelations = relations(
    portfolio,
    ({ one }) => ({
        user: one(user, {
            fields: [portfolio.userId],
            references: [user.id],
        }),
    }),
);