import { t, type Static } from "elysia";
import { LicensePolicy } from "@/generated/prisma";
import { PaginationQuerySchema } from "@/types/pagination";
import { PaginationSchema } from "@/types/response";
import { tDateTime, tStringEnum, tStringUnion } from "@/types/schema";

const LicensePolicyEnum = tStringEnum(LicensePolicy);

export const LicenseRuleProjectParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const LicenseRuleParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  ruleId: t.String({ format: "uuid" }),
});

export const CreateLicenseRuleBodySchema = t.Object({
  licenseId: t.String({ minLength: 1, maxLength: 255 }),
  policy: LicensePolicyEnum,
});

export const UpdateLicenseRuleBodySchema = t.Object({
  policy: LicensePolicyEnum,
});

export const LicenseRuleResponseSchema = t.Object({
  id: t.String(),
  projectId: t.String(),
  licenseId: t.String(),
  policy: LicensePolicyEnum,
  createdAt: tDateTime(),
  updatedAt: tDateTime(),
});

export const LicenseRuleListResponseSchema = t.Object({
  items: t.Array(LicenseRuleResponseSchema),
});

export const ComplianceQuerySchema = PaginationQuerySchema(
  t.Object({
    search: t.Optional(t.String()),
  }),
);

export const LicenseComplianceSummarySchema = t.Object({
  total: t.Number(),
  allowed: t.Number(),
  warned: t.Number(),
  blocked: t.Number(),
  unknown: t.Number(),
  dependencies: t.Array(
    t.Object({
      name: t.String(),
      license: t.Nullable(t.String()),
      licensePolicy: t.String(),
      analysisFileName: t.String(),
    }),
  ),
  pagination: PaginationSchema,
});

export const ExportQuerySchema = t.Object({
  format: tStringUnion(["csv", "pdf"] as const),
});

export type CreateLicenseRuleBody = Static<typeof CreateLicenseRuleBodySchema>;
export type UpdateLicenseRuleBody = Static<typeof UpdateLicenseRuleBodySchema>;
export type LicenseRuleResponse = Static<typeof LicenseRuleResponseSchema>;
export type LicenseComplianceSummary = Static<typeof LicenseComplianceSummarySchema>;
export type ExportQuery = Static<typeof ExportQuerySchema>;
