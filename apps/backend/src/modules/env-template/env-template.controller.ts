import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  ApplyTemplateBodySchema,
  ApplyTemplateResponseSchema,
  CreateEnvTemplateBodySchema,
  EnvTemplateDetailResponseSchema,
  EnvTemplateListResponseSchema,
  EnvTemplateResponseSchema,
  TemplateParamsSchema,
  UpdateEnvTemplateBodySchema,
} from "./env-template.schema";
import { EnvTemplateService } from "./env-template.service";

const templateService = container.resolve(EnvTemplateService);

/** Read-only template endpoints (VIEWER+). */
const envTemplateReadController = new Elysia({
  prefix: "/projects/:id/env-templates",
  detail: { tags: ["Environment Templates"] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params }) => templateService.list(params.id), {
    params: StringIdParamSchema,
    response: EnvTemplateListResponseSchema,
    detail: {
      operationId: "listEnvTemplates",
      summary: "List templates",
      description: "List all environment templates for a project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/:templateId", ({ params }) => templateService.getDetail(params.id, params.templateId), {
    params: TemplateParamsSchema,
    response: EnvTemplateDetailResponseSchema,
    detail: {
      operationId: "getEnvTemplate",
      summary: "Get template detail",
      description: "Get a template with its variables.",
      security: [{ bearerAuth: [] }],
    },
  });

/** Write template endpoints (EDITOR+). */
const envTemplateWriteController = new Elysia({
  prefix: "/projects/:id/env-templates",
  detail: { tags: ["Environment Templates"] },
})
  .use(projectGuard("EDITOR"))
  .post(
    "/",
    ({ params, body, projectMember, request, server }) =>
      templateService.create(params.id, body, projectMember.userId, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: CreateEnvTemplateBodySchema,
      response: EnvTemplateResponseSchema,
      detail: {
        operationId: "createEnvTemplate",
        summary: "Create template",
        description: "Create a template from an existing environment or a manual variable list.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:templateId",
    ({ params, body, projectMember, request, server }) =>
      templateService.update(
        params.id,
        params.templateId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: TemplateParamsSchema,
      body: UpdateEnvTemplateBodySchema,
      response: EnvTemplateResponseSchema,
      detail: {
        operationId: "updateEnvTemplate",
        summary: "Update template",
        description: "Update template name or description.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:templateId",
    ({ params, projectMember, request, server }) =>
      templateService.delete(
        params.id,
        params.templateId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: TemplateParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteEnvTemplate",
        summary: "Delete template",
        description: "Delete a template and all its variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/:templateId/apply",
    ({ params, body, projectMember, request, server }) =>
      templateService.apply(
        params.id,
        params.templateId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: TemplateParamsSchema,
      body: ApplyTemplateBodySchema,
      response: ApplyTemplateResponseSchema,
      detail: {
        operationId: "applyEnvTemplate",
        summary: "Apply template",
        description: "Apply a template to create a new environment with empty-valued variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  );

export const envTemplateController = new Elysia()
  .use(envTemplateReadController)
  .use(envTemplateWriteController);
