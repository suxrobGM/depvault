import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<typeof client.api.projects>;
type VaultById = ReturnType<ProjectById["vaults"]>;
type VariableById = ReturnType<VaultById["variables"]>;

export type EnvVariableListResponseDto = Data<VaultById["variables"]["get"]>;
export type EnvVariableDto = EnvVariableListResponseDto["items"][number];

export type ImportResultDto = Data<VaultById["import"]["post"]>;

export type ExportResultDto = Data<VaultById["export"]["get"]>;

export type EnvBundleResultDto = Data<VaultById["bundle"]["post"]>;

export type EnvVariableVersionListResponseDto = Data<VariableById["versions"]["get"]>;
export type EnvVariableVersionDto = EnvVariableVersionListResponseDto["items"][number];
