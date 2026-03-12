import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type EnvironmentListResponse = Data<ProjectById["environments"]["get"]>;
export type EnvironmentItem = EnvironmentListResponse[number];

export type EnvDiffResponse = Data<ProjectById["environments"]["diff"]["get"]>;
export type EnvDiffRow = EnvDiffResponse["rows"][number];

export type EnvironmentBundleBody = Parameters<ProjectById["environments"]["bundle"]["post"]>[0];
