import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type EnvVariableListResponse = Data<ProjectById["env-variables"]["get"]>;
export type EnvVariable = EnvVariableListResponse["items"][number];

export type ImportResult = Data<ProjectById["env-variables"]["import"]["post"]>;

export type ExportResult = Data<ProjectById["env-variables"]["export"]["get"]>;
