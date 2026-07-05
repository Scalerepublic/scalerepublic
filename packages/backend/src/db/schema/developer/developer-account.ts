import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from '../auth-schema.ts';

export const developerAccount = pgTable('developer_account', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  enabledAt: timestamp('enabled_at').defaultNow().notNull(),
});

export const developerAccountRelations = relations(developerAccount, ({ one }) => ({
  user: one(user, {
    fields: [developerAccount.userId],
    references: [user.id],
  }),
}));
