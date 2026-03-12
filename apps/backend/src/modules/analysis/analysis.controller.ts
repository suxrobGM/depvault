import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import {
  AnalysisItemParamsSchema,
  AnalysisListQuerySchema,
  AnalysisListResponseSchema,
  AnalysisProjectParamsSchema,
  AnalysisResponseSchema,
  CreateAnalysisBodySchema,
  UpdateAnalysisBodySchema,
} from "./analysis.schema";
import { AnalysisService } from "./analysis.service";

const analysisService = container.resolve(AnalysisService);

export const analysisController = new Elysia({
  prefix: "/projects/:id/analyses",
  detail: { tags: ["Analyses"] },
})
  .use(authGuard)
  .post(
    "/",
    ({ params, body, user }) => analysisService.create({ ...body, projectId: params.id }, user.id),
    {
      params: AnalysisProjectParamsSchema,
      body: CreateAnalysisBodySchema,
      response: AnalysisResponseSchema,
      detail: {
        summary: "Create analysis",
        description:
          "Parse a dependency file and store the analysis results. Accepts file content, ecosystem type, and project ID. Supports Node.js (package.json, package-lock.json) and Python (requirements.txt, pyproject.toml).",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/",
    ({ params, query, user }) => analysisService.list(params.id, user.id, query.page, query.limit),
    {
      params: AnalysisProjectParamsSchema,
      query: AnalysisListQuerySchema,
      response: AnalysisListResponseSchema,
      detail: {
        summary: "List project analyses",
        description:
          "Return a paginated list of analyses for a specific project. The authenticated user must be a member of the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:analysisId",
    ({ params, user }) => analysisService.getById(params.id, params.analysisId, user.id),
    {
      params: AnalysisItemParamsSchema,
      response: AnalysisResponseSchema,
      detail: {
        summary: "Get analysis details",
        description:
          "Return analysis details with all parsed dependencies. The authenticated user must be a member of the project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .patch(
    "/:analysisId",
    ({ params, body, user }) =>
      analysisService.updateFilePath(params.id, params.analysisId, user.id, body),
    {
      params: AnalysisItemParamsSchema,
      body: UpdateAnalysisBodySchema,
      response: AnalysisResponseSchema,
      detail: {
        summary: "Update analysis",
        description:
          "Update analysis metadata such as file path. Only owners and editors can update.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/:analysisId/rescan",
    ({ params, user }) => analysisService.rescan(params.id, params.analysisId, user.id),
    {
      params: AnalysisItemParamsSchema,
      response: AnalysisResponseSchema,
      detail: {
        summary: "Rescan analysis",
        description:
          "Re-check version updates and vulnerabilities for all dependencies in an existing analysis.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:analysisId",
    ({ params, user }) => analysisService.delete(params.id, params.analysisId, user.id),
    {
      params: AnalysisItemParamsSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete analysis",
        description:
          "Delete an analysis and all its dependencies. Only owners and editors can delete analyses.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
