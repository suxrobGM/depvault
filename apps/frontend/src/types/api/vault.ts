import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;
type VaultById = ReturnType<ProjectById["vaults"]>;

export type VaultListResponse = Data<ProjectById["vaults"]["get"]>;
export type Vault = VaultListResponse[number];

export type VaultResponse = Data<VaultById["put"]>;

export type CloneVaultBody = Parameters<VaultById["clone"]["post"]>[0];

export type VaultTagListResponse = Data<ProjectById["vault-tags"]["get"]>;
