import type { Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;

export type AuditLogListResponseDto = Data<ProjectById["audit-log"]["get"]>;
export type AuditLogEntryDto = AuditLogListResponseDto["items"][number];
export type AuditAction = AuditLogEntryDto["action"];
export type AuditResourceType = AuditLogEntryDto["resourceType"];
