import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type AnalysisListResponse = Data<ProjectById["analyses"]["get"]>;
export type Analysis = AnalysisListResponse["items"][number];

type AnalysisById = ReturnType<ProjectById["analyses"]>;

export type AnalysisDetailResponse = Data<AnalysisById["get"]>;
export type Dependency = AnalysisDetailResponse["dependencies"][number];
export type Vulnerability = Dependency["vulnerabilities"][number];

export type CreateAnalysisBody = Parameters<ProjectById["analyses"]["post"]>[0];
