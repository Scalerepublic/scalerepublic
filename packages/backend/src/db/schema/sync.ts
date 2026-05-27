import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const syncJob = pgTable('sync_job', {
    id: text('id').primaryKey(),
    status: text('status', { enum: ['idle', 'running', 'failed'] }).notNull().default('idle'),
    lastStartedAt: timestamp('last_started_at', { withTimezone: true }),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    lastError: text('last_error'),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
})
