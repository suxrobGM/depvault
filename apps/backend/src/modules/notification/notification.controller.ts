import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import {
  MarkAllReadResponseSchema,
  NotificationIdParamSchema,
  NotificationListQuerySchema,
  NotificationListResponseSchema,
  NotificationResponseSchema,
  UnreadCountResponseSchema,
} from "./notification.schema";
import { NotificationService } from "./notification.service";

const notificationService = container.resolve(NotificationService);

export const notificationController = new Elysia({
  prefix: "/notifications",
  detail: { tags: ["Notifications"] },
})
  .use(authGuard)
  .get(
    "/",
    ({ query, user }) =>
      notificationService.list(
        user.id,
        { type: query.type, read: query.read },
        query.page,
        query.limit,
      ),
    {
      query: NotificationListQuerySchema,
      response: NotificationListResponseSchema,
      detail: {
        summary: "List notifications",
        description: "Return a paginated list of notifications for the authenticated user.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get("/unread-count", ({ user }) => notificationService.getUnreadCount(user.id), {
    response: UnreadCountResponseSchema,
    detail: {
      summary: "Get unread count",
      description: "Return the number of unread notifications for the authenticated user.",
      security: [{ bearerAuth: [] }],
    },
  })
  .patch("/read-all", ({ user }) => notificationService.markAllRead(user.id), {
    response: MarkAllReadResponseSchema,
    detail: {
      summary: "Mark all notifications read",
      description: "Mark all unread notifications as read for the authenticated user.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/:notificationId",
    ({ params, user }) => notificationService.getById(user.id, params.notificationId),
    {
      params: NotificationIdParamSchema,
      response: NotificationResponseSchema,
      detail: {
        summary: "Get notification",
        description: "Return a single notification by ID.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .patch(
    "/:notificationId/read",
    ({ params, user }) => notificationService.markRead(user.id, params.notificationId),
    {
      params: NotificationIdParamSchema,
      response: NotificationResponseSchema,
      detail: {
        summary: "Mark notification read",
        description: "Mark a single notification as read.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:notificationId",
    ({ params, user }) => notificationService.delete(user.id, params.notificationId),
    {
      params: NotificationIdParamSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete notification",
        description: "Delete a single notification.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
