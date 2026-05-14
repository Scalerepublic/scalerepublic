import { relations } from "drizzle-orm"; //hiermit veschreben welche Tabellen wie zusammenhängen
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"; //damit neue Tabelle für Postgres Tabelle erstellen

import { user } from "./auth-schema.ts"; //bestehende better auth Tabelle, auf die User wird nämlich verwiesen

export const userProfile = pgTable("user_profile", { //neue Tabelle erstellen
  //jedes userprofile gehört zu genau einem better-auth user
  //Spalte in dieser Tabelle
    userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }), //wird automatisch mitgelöscht

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