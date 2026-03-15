import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import {
  GlobalAuditLogListQuerySchema,
  GlobalAuditLogListResponseSchema,
} from "@/modules/audit-log/audit-log.schema";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";

const auditLogService = container.resolve(AuditLogService);

export const activityController = new Elysia({
  prefix: "/activity",
  detail: { tags: ["Activity"] },
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
        security: [{ bearerAuth: [] }],
      },
    },
  );
