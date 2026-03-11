import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type EnvVariableListResponse = Data<ProjectById["environments"]["variables"]["get"]>;
export type EnvVariable = EnvVariableListResponse["items"][number];

export type ImportResult = Data<ProjectById["environments"]["import"]["post"]>;

export type ExportResult = Data<ProjectById["environments"]["export"]["get"]>;
