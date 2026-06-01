import type { client } from "@/lib/api";
import type { Body, Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;
type VaultById = ReturnType<ProjectById["vaults"]>;

export type VaultListResponseDto = Data<ProjectById["vaults"]["get"]>;
export type VaultDto = VaultListResponseDto[number];

export type VaultDetailDto = Data<VaultById["put"]>;

export type CloneVaultBody = Body<VaultById["clone"]["post"]>;

export type VaultTagListResponseDto = Data<ProjectById["vault-tags"]["get"]>;
