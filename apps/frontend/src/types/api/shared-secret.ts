import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;
type SharedSecretByToken = ReturnType<typeof client.api.secrets.shared>;

export type SharedSecretAuditListResponseDto = Data<ProjectById["secrets"]["shared"]["get"]>;
export type SharedSecretAuditItemDto = SharedSecretAuditListResponseDto["items"][number];

export type CreateShareDto = Data<ProjectById["secrets"]["shared"]["env"]["post"]>;

export type SharedSecretInfoDto = Data<SharedSecretByToken["info"]["get"]>;

export type AccessSecretDto = Data<SharedSecretByToken["post"]>;
