import type { client } from "@/lib/api";
import type { Data } from "./utils";

type ProjectById = ReturnType<(typeof client)["api"]["projects"]>;

export type LicenseRuleListResponse = Data<ProjectById["license-rules"]["get"]>;
export type LicenseRule = LicenseRuleListResponse["items"][number];

export type LicenseComplianceSummary = Data<ProjectById["license-rules"]["compliance"]["get"]>;
export type LicenseComplianceDep = LicenseComplianceSummary["dependencies"][number];

export type CreateLicenseRuleBody = Parameters<ProjectById["license-rules"]["post"]>[0];
export type UpdateLicenseRuleBody = Parameters<ReturnType<ProjectById["license-rules"]>["put"]>[0];
