import { t, type Static } from "elysia";
import { NotificationType } from "@/generated/prisma";
import { PaginatedResponseSchema } from "@/types/response";

export const NotificationTypeSchema = t.Enum(NotificationType);

export const NotificationResponseSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  type: NotificationTypeSchema,
  title: t.String(),
  message: t.String(),
  read: t.Boolean(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const NotificationListQuerySchema = t.Object({
  type: t.Optional(NotificationTypeSchema),
  read: t.Optional(t.BooleanString()),
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const NotificationListResponseSchema = PaginatedResponseSchema(NotificationResponseSchema);

export const UnreadCountResponseSchema = t.Object({
  count: t.Number(),
});

export const NotificationIdParamSchema = t.Object({
  notificationId: t.String(),
});

export const MarkAllReadResponseSchema = t.Object({
  count: t.Number(),
});

export type NotificationResponse = Static<typeof NotificationResponseSchema>;
export type NotificationListQuery = Static<typeof NotificationListQuerySchema>;
export type NotificationIdParam = Static<typeof NotificationIdParamSchema>;
