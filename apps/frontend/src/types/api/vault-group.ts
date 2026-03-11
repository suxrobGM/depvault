import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type VaultGroupListResponse = Data<ProjectById["vault-groups"]["get"]>;
export type VaultGroup = VaultGroupListResponse[number];

type VaultGroupById = ReturnType<ProjectById["vault-groups"]>;

export type VaultGroupResponse = Data<VaultGroupById["put"]>;
