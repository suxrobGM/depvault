import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;
type VaultById = ReturnType<ProjectById["vaults"]>;
type VariableById = ReturnType<VaultById["variables"]>;

export type EnvVariableListResponse = Data<VaultById["variables"]["get"]>;
export type EnvVariable = EnvVariableListResponse["items"][number];

export type ImportResult = Data<VaultById["import"]["post"]>;

export type ExportResult = Data<VaultById["export"]["get"]>;

export type EnvBundleResult = Data<VaultById["bundle"]["post"]>;

export type EnvVariableVersionListResponse = Data<VariableById["versions"]["get"]>;
export type EnvVariableVersion = EnvVariableVersionListResponse["items"][number];
