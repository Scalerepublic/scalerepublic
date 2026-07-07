import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { useCtx, type App, type AppEnv } from "../../context.ts";
import { requireAuth } from "../../lib/require-auth.ts";

import { listNotificationsQuerySchema, notificationIdParamSchema } from "./notification.schema.ts";

export const notificationRoutes = new Hono<AppEnv>()
    .get("/api/v1/notifications", zValidator("query", listNotificationsQuerySchema), async (c) => {
        const authResult = await requireAuth(c);
        if (authResult instanceof Response) return authResult;

        const { unreadOnly, limit } = c.req.valid("query");
        const { notificationService } = useCtx(c);
        const data = await notificationService.getByUserId(authResult.user.id, { unreadOnly, limit });
        return c.json({ data });
    })
    .get("/api/v1/notifications/unread-count", async (c) => {
        const authResult = await requireAuth(c);
        if (authResult instanceof Response) return authResult;

        const { notificationService } = useCtx(c);
        const count = await notificationService.getUnreadCount(authResult.user.id);
        return c.json({ data: { count } });
    })
    .post("/api/v1/notifications/read-all", async (c) => {
        const authResult = await requireAuth(c);
        if (authResult instanceof Response) return authResult;

        const { notificationService } = useCtx(c);
        const updated = await notificationService.markAllAsRead(authResult.user.id);
        return c.json({ data: { updated } });
    })
    .post("/api/v1/notifications/:id/read", zValidator("param", notificationIdParamSchema), async (c) => {
        const authResult = await requireAuth(c);
        if (authResult instanceof Response) return authResult;

        const { id } = c.req.valid("param");
        const { notificationService } = useCtx(c);
        const updated = await notificationService.markAsRead(id, authResult.user.id);
        if (updated === null) {
            return c.json({ error: "Notification not found" }, 404);
        }
        return c.json({ data: updated });
    });

export const registerNotificationRoutes = (app: App) => {
    app.route('/', notificationRoutes);
};
