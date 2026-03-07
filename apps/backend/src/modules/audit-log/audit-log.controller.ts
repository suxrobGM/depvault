import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import { AuditLogListQuerySchema, AuditLogListResponseSchema } from "./audit-log.schema";
import { AuditLogService } from "./audit-log.service";

const auditLogService = container.resolve(AuditLogService);

export const auditLogController = new Elysia({
  prefix: "/projects/:id/audit-log",
  detail: { tags: ["Audit Log"] },
})
  .use(authGuard)
  .get(
    "/",
    ({ params, query, user }) =>
      auditLogService.list(
        params.id,
        user.id,
        {
          action: query.action,
          resourceType: query.resourceType,
        },
        query.page,
        query.limit,
      ),
    {
      params: StringIdParamSchema,
      query: AuditLogListQuerySchema,
      response: AuditLogListResponseSchema,
      detail: {
        summary: "List audit log events",
        description:
          "Return a paginated list of audit log events for a project. Only owners and editors can view audit logs. Audit logs are append-only and cannot be modified or deleted.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
