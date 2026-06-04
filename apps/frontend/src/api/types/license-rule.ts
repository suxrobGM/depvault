import type { Body, Data } from "@depvault/shared/api";
import type { client } from "@/api/client";

type ProjectById = ReturnType<typeof client.api.projects>;
type LicenseRuleById = ReturnType<ProjectById["license-rules"]>;

export type LicenseRuleListResponseDto = Data<ProjectById["license-rules"]["get"]>;
export type LicenseRuleDto = LicenseRuleListResponseDto["items"][number];

export type LicenseComplianceSummaryDto = Data<ProjectById["license-rules"]["compliance"]["get"]>;
export type LicenseComplianceDepDto = LicenseComplianceSummaryDto["dependencies"][number];

export type CreateLicenseRuleBody = Body<ProjectById["license-rules"]["post"]>;
export type UpdateLicenseRuleBody = Body<LicenseRuleById["put"]>;
