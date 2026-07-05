import { relations } from 'drizzle-orm';
import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from '../auth-schema.ts';

export const apiKeyScopeEnum = pgEnum('api_key_scope', ['read', 'trade']);

export const apiKey = pgTable(
  'api_key',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    hashedKey: text('hashed_key').notNull().unique(),
    scopes: apiKeyScopeEnum('scopes').array().notNull(),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    requestWindowStartedAt: timestamp('request_window_started_at'),
    requestWindowCount: integer('request_window_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('api_key_user_id_idx').on(table.userId)],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
}));
