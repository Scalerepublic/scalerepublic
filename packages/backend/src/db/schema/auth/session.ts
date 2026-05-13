import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./user";

/**
 * SESSION TABLE
 * Stores active login sessions.
 */

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),

    // used in cookies / headers
    token: text("token").notNull().unique(),

    expiresAt: timestamp("expires_at").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),

    // optional security metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // FK → user.id
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ],
);