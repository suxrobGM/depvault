import { t, type Static } from "elysia";
import { AuditAction, AuditResourceType } from "@/generated/prisma";

export const AuditActionSchema = t.Enum(AuditAction);
export const AuditResourceTypeSchema = t.Enum(AuditResourceType);

export const AuditLogResponseSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  projectId: t.String(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: t.String(),
  ipAddress: t.String(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: t.Date(),
  userEmail: t.Optional(t.String()),
});

export const AuditLogListQuerySchema = t.Object({
  action: t.Optional(AuditActionSchema),
  resourceType: t.Optional(AuditResourceTypeSchema),
  page: t.Integer({ minimum: 1, default: 1 }),
  limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const AuditLogListResponseSchema = t.Object({
  items: t.Array(AuditLogResponseSchema),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export type AuditLogResponse = Static<typeof AuditLogResponseSchema>;
export type AuditLogListQuery = Static<typeof AuditLogListQuerySchema>;
