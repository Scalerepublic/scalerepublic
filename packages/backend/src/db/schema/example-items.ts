import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const exampleItems = pgTable('example_items', {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
