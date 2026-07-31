/**
 * Purpose: Define the notification tables, constraints, indexes, relations, and inferred row types.
 */
import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    boolean,
    jsonb,
    timestamp,
    index,
    uniqueIndex,
    pgEnum,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema.ts";

export const notificationTypeEnum = pgEnum("notification_type", [
    "AUTOTRADE_TRIGGERED",
    "AUTOTRADE_EXPIRED",
    "AUTOTRADE_FAILED",
]);

export const notification = pgTable(
    "notification",
    {
        id: text("id").primaryKey(),

        userId: text("user_id")
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
            }),

        type: notificationTypeEnum("type").notNull(),

        key: text("key").notNull(),

        data: jsonb("data").$type<Record<string, unknown>>(),

        read: boolean("read").notNull().default(false),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("notification_key_idx").on(table.key),
        index("notification_user_read_idx").on(table.userId, table.read),
    ],
);

export const notificationRelations = relations(notification, ({ one }) => ({
    user: one(user, {
        fields: [notification.userId],
        references: [user.id],
    }),
}));
