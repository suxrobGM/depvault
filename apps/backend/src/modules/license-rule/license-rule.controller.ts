import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import {
  ComplianceQuerySchema,
  CreateLicenseRuleBodySchema,
  ExportQuerySchema,
  LicenseComplianceSummarySchema,
  LicenseRuleListResponseSchema,
  LicenseRuleParamsSchema,
  LicenseRuleProjectParamsSchema,
  LicenseRuleResponseSchema,
  UpdateLicenseRuleBodySchema,
} from "./license-rule.schema";
import { LicenseRuleService } from "./license-rule.service";

const licenseRuleService = container.resolve(LicenseRuleService);

export const licenseRuleController = new Elysia({
  prefix: "/projects/:id/license-rules",
  detail: { tags: ["License Rules"] },
})
  .use(authGuard)
  .get("/", ({ params, user }) => licenseRuleService.list(params.id, user.id), {
    params: LicenseRuleProjectParamsSchema,
    response: LicenseRuleListResponseSchema,
    detail: {
      summary: "List license rules",
      description: "Return all license policy rules for the project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/", ({ params, body, user }) => licenseRuleService.create(params.id, user.id, body), {
    params: LicenseRuleProjectParamsSchema,
    body: CreateLicenseRuleBodySchema,
    response: LicenseRuleResponseSchema,
    detail: {
      summary: "Create license rule",
      description:
        "Create a license policy rule mapping an SPDX license ID to ALLOW, WARN, or BLOCK.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put(
    "/:ruleId",
    ({ params, body, user }) => licenseRuleService.update(params.id, params.ruleId, user.id, body),
    {
      params: LicenseRuleParamsSchema,
      body: UpdateLicenseRuleBodySchema,
      response: LicenseRuleResponseSchema,
      detail: {
        summary: "Update license rule",
        description: "Update the policy for an existing license rule.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:ruleId",
    ({ params, user }) => licenseRuleService.delete(params.id, params.ruleId, user.id),
    {
      params: LicenseRuleParamsSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete license rule",
        description: "Delete a license policy rule from the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/compliance",
    ({ params, query, user }) =>
      licenseRuleService.getComplianceSummary(
        params.id,
        user.id,
        query.page,
        query.limit,
        query.search,
      ),
    {
      params: LicenseRuleProjectParamsSchema,
      query: ComplianceQuerySchema,
      response: LicenseComplianceSummarySchema,
      detail: {
        summary: "License compliance summary",
        description:
          "Return a paginated compliance summary with pass/warn/fail counts for all dependencies in the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/export",
    async ({ params, query, user, set }) => {
      const result = await licenseRuleService.exportReport(params.id, user.id, query.format);
      set.headers["content-type"] = result.contentType;
      set.headers["content-disposition"] = `attachment; filename="${result.fileName}"`;
      return result.content;
    },
    {
      params: LicenseRuleProjectParamsSchema,
      query: ExportQuerySchema,
      detail: {
        summary: "Export license audit report",
        description: "Export a license audit report as CSV or text.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
