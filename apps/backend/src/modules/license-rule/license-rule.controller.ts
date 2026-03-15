import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
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
  .use(projectGuard("VIEWER"))
  .get("/", ({ params }) => licenseRuleService.list(params.id), {
    params: LicenseRuleProjectParamsSchema,
    response: LicenseRuleListResponseSchema,
    detail: {
      operationId: "listLicenseRules",
      summary: "List license rules",
      description: "Return all license policy rules for the project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/compliance",
    ({ params, query }) =>
      licenseRuleService.getComplianceSummary(params.id, query.page, query.limit, query.search),
    {
      params: LicenseRuleProjectParamsSchema,
      query: ComplianceQuerySchema,
      response: LicenseComplianceSummarySchema,
      detail: {
        operationId: "getLicenseCompliance",
        summary: "License compliance summary",
        description:
          "Return a paginated compliance summary with pass/warn/fail counts for all dependencies in the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/export",
    async ({ params, query, set }) => {
      const result = await licenseRuleService.exportReport(params.id, query.format);
      set.headers["content-type"] = result.contentType;
      set.headers["content-disposition"] = `attachment; filename="${result.fileName}"`;
      return result.content;
    },
    {
      params: LicenseRuleProjectParamsSchema,
      query: ExportQuerySchema,
      detail: {
        operationId: "exportLicenseReport",
        summary: "Export license audit report",
        description: "Export a license audit report as CSV or text.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post("/", ({ params, body }) => licenseRuleService.create(params.id, body), {
    params: LicenseRuleProjectParamsSchema,
    body: CreateLicenseRuleBodySchema,
    response: LicenseRuleResponseSchema,
    detail: {
      operationId: "createLicenseRule",
      summary: "Create license rule",
      description:
        "Create a license policy rule mapping an SPDX license ID to ALLOW, WARN, or BLOCK.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put(
    "/:ruleId",
    ({ params, body }) => licenseRuleService.update(params.id, params.ruleId, body),
    {
      params: LicenseRuleParamsSchema,
      body: UpdateLicenseRuleBodySchema,
      response: LicenseRuleResponseSchema,
      detail: {
        operationId: "updateLicenseRule",
        summary: "Update license rule",
        description: "Update the policy for an existing license rule.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete("/:ruleId", ({ params }) => licenseRuleService.delete(params.id, params.ruleId), {
    params: LicenseRuleParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteLicenseRule",
      summary: "Delete license rule",
      description: "Delete a license policy rule from the project.",
      security: [{ bearerAuth: [] }],
    },
  });
