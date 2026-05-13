import { relations } from "drizzle-orm";
import { user } from "./user";
import { session } from "./session";
import { account } from "./account";

/**
 * AUTH RELATIONS
 * Defines how auth tables connect logically.
 */

/**
 * One user → many sessions/accounts
 */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

/**
 * Each session → one user
 */
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

/**
 * Each account → one user
 */
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));