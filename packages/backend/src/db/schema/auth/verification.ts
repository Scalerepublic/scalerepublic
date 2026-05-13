import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * VERIFICATION TABLE
 * Used for email verification and password reset flows.
 */

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),

    // email or identifier being verified
    identifier: text("identifier").notNull(),

    // verification token / code
    value: text("value").notNull(),

    expiresAt: timestamp("expires_at").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ],
);