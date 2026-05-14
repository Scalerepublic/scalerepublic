import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

/**
 * USER TABLE
 * Core identity of the system.
 * Each user represents a trader in the stock exchange.
 */

export const user = pgTable("user", {
 
  id: text("id").primaryKey(),

  name: text("name").notNull(),

  email: text("email").notNull().unique(),

  emailVerified: boolean("email_verified").default(false).notNull(),

  // optional
  image: text("image"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  // auto updated
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
},
(table) => [
  index("user_email_idx").on(table.email),
]);