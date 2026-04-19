import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard, projectGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import {
  AuditLogListQuerySchema,
  AuditLogListResponseSchema,
  GlobalAuditLogListQuerySchema,
  GlobalAuditLogListResponseSchema,
} from "./audit-log.schema";
import { AuditLogService } from "./audit-log.service";

const auditLogService = container.resolve(AuditLogService);

export const auditLogController = new Elysia({
  prefix: "/projects/:id/audit-log",
  detail: { tags: ["Audit Log"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("EDITOR"))
  .get(
    "/",
    ({ params, query, projectMember }) =>
      auditLogService.list(
        params.id,
        projectMember.userId,
        {
          action: query.action,
          resourceType: query.resourceType,
          from: query.from,
          to: query.to,
          userEmail: query.userEmail,
        },
        query.page,
        query.limit,
      ),
    {
      params: StringIdParamSchema,
      query: AuditLogListQuerySchema,
      response: AuditLogListResponseSchema,
      detail: {
        operationId: "listAuditLog",
        summary: "List audit log events",
        description:
          "Return a paginated list of audit log events for a project. Only owners and editors can view audit logs. Audit logs are append-only and cannot be modified or deleted.",
      },
    },
  );

export const activityController = new Elysia({
  prefix: "/activity",
  detail: { tags: ["Activity"], security: [{ bearerAuth: [] }] },
})
  .use(authGuard)
  .get(
    "/",
    ({ query, user }) =>
      auditLogService.listGlobal(
        user.id,
        {
          action: query.action,
          resourceType: query.resourceType,
          from: query.from,
          to: query.to,
        },
        query.page,
        query.limit,
      ),
    {
      query: GlobalAuditLogListQuerySchema,
      response: GlobalAuditLogListResponseSchema,
      detail: {
        operationId: "listActivity",
        summary: "List global activity",
        description:
          "Return a paginated list of audit log events across all projects the user is a member of.",
      },
    },
  );
