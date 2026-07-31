/**
 * Purpose: Persist, list, count, and mark notifications while enforcing per-user ownership.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import type { AppVars } from '../../context.ts';
import type { DbOrTx } from '../../db/index.ts';
import { notification } from '../../db/schema/notification.ts';

export type NotificationRecord = typeof notification.$inferSelect;
export type NotificationType = NotificationRecord['type'];

export class NotificationService {
    constructor(private readonly ctx: AppVars) {}

    async create(
        params: {
            userId: string;
            type: NotificationType;
            key: string;
            data?: Record<string, unknown> | null;
        },
        db: DbOrTx = this.ctx.db,
    ): Promise<NotificationRecord | null> {
        const rows = await db
            .insert(notification)
            .values({
                id: crypto.randomUUID(),
                userId: params.userId,
                type: params.type,
                key: params.key,
                data: params.data ?? null,
            })
            .onConflictDoNothing({ target: notification.key })
            .returning();

        return rows[0] ?? null;
    }

    async getByUserId(
        userId: string,
        opts: { unreadOnly?: boolean; limit?: number } = {},
    ): Promise<NotificationRecord[]> {
        const conditions = [eq(notification.userId, userId)];
        if (opts.unreadOnly === true) {
            conditions.push(eq(notification.read, false));
        }

        return this.ctx.db
            .select()
            .from(notification)
            .where(and(...conditions))
            .orderBy(desc(notification.createdAt))
            .limit(opts.limit ?? 50);
    }

    async getUnreadCount(userId: string): Promise<number> {
        const rows = await this.ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(notification)
            .where(and(eq(notification.userId, userId), eq(notification.read, false)));

        return rows[0]?.count ?? 0;
    }

    async markAsRead(notificationId: string, userId: string): Promise<NotificationRecord | null> {
        const rows = await this.ctx.db
            .update(notification)
            .set({ read: true })
            .where(
                and(
                    eq(notification.id, notificationId),
                    eq(notification.userId, userId),
                    eq(notification.read, false),
                ),
            )
            .returning();

        return rows[0] ?? null;
    }

    async markAllAsRead(userId: string): Promise<number> {
        const rows = await this.ctx.db
            .update(notification)
            .set({ read: true })
            .where(and(eq(notification.userId, userId), eq(notification.read, false)))
            .returning({ id: notification.id });

        return rows.length;
    }
}
