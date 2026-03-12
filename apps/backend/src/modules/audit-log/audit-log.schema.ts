import { t, type Static } from "elysia";
import { AuditAction, AuditResourceType } from "@/generated/prisma";
import { DateRangeQuerySchema, PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";

export const AuditActionSchema = t.Enum(AuditAction);
export const AuditResourceTypeSchema = t.Enum(AuditResourceType);

export const AuditLogResponseSchema = t.Object({
  id: t.String(),
  userId: t.Nullable(t.String()),
  projectId: t.String(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: t.String(),
  ipAddress: t.String(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: t.Date(),
  userEmail: t.Nullable(t.String()),
  userFirstName: t.Nullable(t.String()),
  userLastName: t.Nullable(t.String()),
  userAvatarUrl: t.Nullable(t.String()),
});

export const AuditLogListQuerySchema = t.Composite([
  PaginationQueryBaseSchema,
  DateRangeQuerySchema,
  t.Object({
    action: t.Optional(AuditActionSchema),
    resourceType: t.Optional(AuditResourceTypeSchema),
    userEmail: t.Optional(t.String()),
  }),
]);

export const AuditLogListResponseSchema = PaginatedResponseSchema(AuditLogResponseSchema);

export type AuditLogResponse = Static<typeof AuditLogResponseSchema>;
export type AuditLogListQuery = Static<typeof AuditLogListQuerySchema>;
