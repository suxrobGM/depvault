import type { Body, Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;

export type AnalysisListResponseDto = Data<ProjectById["analyses"]["get"]>;
export type AnalysisDto = AnalysisListResponseDto["items"][number];

type AnalysisById = ReturnType<ProjectById["analyses"]>;

export type AnalysisDetailDto = Data<AnalysisById["get"]>;
export type DependencyDto = AnalysisDetailDto["dependencies"][number];
export type VulnerabilityDto = DependencyDto["vulnerabilities"][number];

export type CreateAnalysisBody = Body<ProjectById["analyses"]["post"]>;
