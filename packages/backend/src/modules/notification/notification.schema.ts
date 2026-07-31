import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
    unreadOnly: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => v === "true"),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

export const notificationIdParamSchema = z.object({
    id: z.string().min(1),
});
