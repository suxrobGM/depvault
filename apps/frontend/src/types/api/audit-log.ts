import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;

export type AuditLogListResponseDto = Data<ProjectById["audit-log"]["get"]>;
export type AuditLogEntryDto = AuditLogListResponseDto["items"][number];
export type AuditAction = AuditLogEntryDto["action"];
export type AuditResourceType = AuditLogEntryDto["resourceType"];
