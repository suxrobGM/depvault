import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type AuditLogListResponse = Data<ProjectById["audit-log"]["get"]>;
export type AuditLogEntry = AuditLogListResponse["items"][number];
