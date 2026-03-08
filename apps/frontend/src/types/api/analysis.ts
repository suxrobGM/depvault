import type { client } from "@/lib/api";
import type { Data } from "./utils";

type AnalysesByProject = ReturnType<(typeof client)["api"]["analyses"]["project"]>;

export type AnalysisListResponse = Data<AnalysesByProject["get"]>;
export type Analysis = AnalysisListResponse["items"][number];

type AnalysisById = ReturnType<AnalysesByProject>;

export type AnalysisDetailResponse = Data<AnalysisById["get"]>;
export type Dependency = AnalysisDetailResponse["dependencies"][number];
export type Vulnerability = Dependency["vulnerabilities"][number];
