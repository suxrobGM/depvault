import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { requireRole } from "@/common/middleware/role.middleware";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  AdminStatsResponseSchema,
  AdminSubscriptionListQuerySchema,
  AdminSubscriptionListResponseSchema,
  AdminUserDetailResponseSchema,
  AdminUserListQuerySchema,
  AdminUserListResponseSchema,
  CompSubscriptionBodySchema,
} from "./admin.schema";
import { AdminService } from "./admin.service";

const adminService = container.resolve(AdminService);

export const adminController = new Elysia({
  prefix: "/admin",
  detail: { tags: ["Admin"] },
})
  .use(authGuard)
  .use(requireRole("ADMIN"))
  .get("/stats", () => adminService.getStats(), {
    response: AdminStatsResponseSchema,
    detail: {
      operationId: "getAdminStats",
      summary: "Get admin dashboard stats",
      description: "Return aggregate statistics: total users, plan breakdown, MRR, churn.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/users", ({ query }) => adminService.listUsers(query), {
    query: AdminUserListQuerySchema,
    response: AdminUserListResponseSchema,
    detail: {
      operationId: "listAdminUsers",
      summary: "List all users",
      description:
        "Return a paginated list of all users with subscription info. Supports search and plan filter.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/users/:id", ({ params }) => adminService.getUserDetail(params.id), {
    params: StringIdParamSchema,
    response: AdminUserDetailResponseSchema,
    detail: {
      operationId: "getAdminUserDetail",
      summary: "Get user detail",
      description: "Return detailed user info with subscription, usage stats, and owned projects.",
      security: [{ bearerAuth: [] }],
    },
  })
  .patch(
    "/users/:id/subscription",
    ({ params, body }) => adminService.assignCompSubscription(params.id, body),
    {
      params: StringIdParamSchema,
      body: CompSubscriptionBodySchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "assignCompSubscription",
        summary: "Assign admin-granted subscription",
        description:
          "Grant a PRO or TEAM subscription to a user without Stripe charge. Useful for test accounts or internal users.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/users/:id/subscription",
    ({ params }) => adminService.revokeCompSubscription(params.id),
    {
      params: StringIdParamSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "revokeCompSubscription",
        summary: "Revoke admin-granted subscription",
        description: "Revert a user's admin-granted subscription back to the FREE plan.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get("/subscriptions", ({ query }) => adminService.listSubscriptions(query), {
    query: AdminSubscriptionListQuerySchema,
    response: AdminSubscriptionListResponseSchema,
    detail: {
      operationId: "listAdminSubscriptions",
      summary: "List all subscriptions",
      description: "Return a paginated list of all subscriptions with user info and filters.",
      security: [{ bearerAuth: [] }],
    },
  });
