import { relations } from "drizzle-orm"; //Hiermit veschreben welche Tabellen wie zusammenhängen
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"; //Damit neue Tabelle für Postgres Tabelle erstellen

import { user } from "./auth-schema.ts"; //Bestehende better auth Tabelle, auf die User wird nämlich verwiesen

export const userProfile = pgTable("user_profile", { //Neue Tabelle erstellen
  //Jedes userprofile gehört zu genau einem better-auth user
  //Spalte in dieser Tabelle
    userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }), //Wird automatisch mitgelöscht

//Spalte für Cash des Users
  cashBalance: integer("cash_balance").notNull().default(100_000),

  isDefaulted: boolean("is_defaulted").notNull().default(false),

  defaultedAt: timestamp("defaulted_at"),

  penaltyCounter: integer("penalty_counter").notNull().default(0),
});

//Relations-Zeilen

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { //Beziehung: user
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));