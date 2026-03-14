import { t, type Static } from "elysia";
import { NotificationType } from "@/generated/prisma";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { tDateTime, tStringEnum } from "@/types/schema";

export const NotificationTypeSchema = tStringEnum(NotificationType);

export const NotificationResponseSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  type: NotificationTypeSchema,
  title: t.String(),
  message: t.String(),
  read: t.Boolean(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
});

export const NotificationListQuerySchema = PaginationQuerySchema(
  t.Object({
    type: t.Optional(NotificationTypeSchema),
    read: t.Optional(t.BooleanString()),
  }),
);

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
