import type { ApiClient } from "@depvault/shared/api";
import type { Treaty } from "@elysiajs/eden";

type Data<T extends (...args: any[]) => any> = NonNullable<Treaty.Data<T>>;

// ── Parameterized route helpers ──

type ProjectById = ReturnType<ApiClient["api"]["projects"]>;
type SecretFileById = ReturnType<ProjectById["secrets"]>;

// ── Response types ──

export type ProjectListResponse = Data<ApiClient["api"]["projects"]["get"]>;
export type Project = ProjectListResponse["items"][number];
export type ProjectResponse = Data<ProjectById["get"]>;

export type VaultStatusResponse = Data<ApiClient["api"]["vault"]["status"]["get"]>;

export type KeyGrantResponse = Data<ProjectById["keygrants"]["my"]["get"]>;

export type VaultGroupListResponse = Data<ProjectById["vault-groups"]["get"]>;
export type VaultGroup = VaultGroupListResponse[number];

export type EnvExportResponse = Data<ProjectById["environments"]["export"]["get"]>;
export type EnvExportEntry = EnvExportResponse["entries"][number];

export type EnvImportResponse = Data<ProjectById["environments"]["import"]["post"]>;

export type EnvVariableListResponse = Data<ProjectById["environments"]["variables"]["get"]>;
export type EnvVariable = EnvVariableListResponse["items"][number];

export type EnvDiffResponse = Data<ProjectById["environments"]["diff"]["get"]>;

export type SecretFileListResponse = Data<ProjectById["secrets"]["get"]>;
export type SecretFile = SecretFileListResponse["items"][number];

export type SecretFileDownloadResponse = Data<SecretFileById["download"]["get"]>;

export type AnalysisResponse = Data<ProjectById["analyses"]["post"]>;

export type CiSecretsResponse = Data<ApiClient["api"]["ci"]["secrets"]["get"]>;

export type DeviceCodeResponse = Data<ApiClient["api"]["auth"]["device"]["post"]>;
export type DeviceTokenResponse = Data<ApiClient["api"]["auth"]["device"]["token"]["post"]>;
