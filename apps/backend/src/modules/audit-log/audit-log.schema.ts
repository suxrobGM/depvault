import { t, type Static } from "elysia";
import { AuditAction, AuditResourceType } from "@/generated/prisma";
import { DateRangeQuerySchema, PaginationQueryBaseSchema } from "@/types/pagination";
import { PaginatedResponseSchema } from "@/types/response";
import { tDateTime, tStringEnum } from "@/types/schema";

export const AuditActionSchema = tStringEnum(AuditAction);
export const AuditResourceTypeSchema = tStringEnum(AuditResourceType);

export const AuditLogResponseSchema = t.Object({
  id: t.String(),
  userId: t.Nullable(t.String()),
  projectId: t.String(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: t.String(),
  ipAddress: t.String(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: tDateTime(),
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

export const GlobalAuditLogResponseSchema = t.Object({
  id: t.String(),
  userId: t.Nullable(t.String()),
  projectId: t.String(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: t.String(),
  ipAddress: t.String(),
  metadata: t.Nullable(t.Unknown()),
  createdAt: tDateTime(),
  userEmail: t.Nullable(t.String()),
  userFirstName: t.Nullable(t.String()),
  userLastName: t.Nullable(t.String()),
  userAvatarUrl: t.Nullable(t.String()),
  projectName: t.String(),
});

export const GlobalAuditLogListQuerySchema = t.Composite([
  PaginationQueryBaseSchema,
  DateRangeQuerySchema,
  t.Object({
    action: t.Optional(AuditActionSchema),
    resourceType: t.Optional(AuditResourceTypeSchema),
  }),
]);

export const GlobalAuditLogListResponseSchema = PaginatedResponseSchema(
  GlobalAuditLogResponseSchema,
);

export type AuditLogResponse = Static<typeof AuditLogResponseSchema>;
export type AuditLogListQuery = Static<typeof AuditLogListQuerySchema>;
export type GlobalAuditLogResponse = Static<typeof GlobalAuditLogResponseSchema>;
export type GlobalAuditLogListQuery = Static<typeof GlobalAuditLogListQuerySchema>;
