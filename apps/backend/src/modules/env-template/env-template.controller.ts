import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
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

export const envTemplateController = new Elysia({
  prefix: "/projects/:id/env-templates",
  detail: { tags: ["Environment Templates"] },
})
  .use(authGuard)
  .post(
    "/",
    ({ params, body, user, request, server }) =>
      templateService.create(params.id, body, user.id, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: CreateEnvTemplateBodySchema,
      response: EnvTemplateResponseSchema,
      detail: {
        summary: "Create template",
        description: "Create a template from an existing environment or a manual variable list.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get("/", ({ params, user }) => templateService.list(params.id, user.id), {
    params: StringIdParamSchema,
    response: EnvTemplateListResponseSchema,
    detail: {
      summary: "List templates",
      description: "List all environment templates for a project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/:templateId",
    ({ params, user }) => templateService.getDetail(params.id, params.templateId, user.id),
    {
      params: TemplateParamsSchema,
      response: EnvTemplateDetailResponseSchema,
      detail: {
        summary: "Get template detail",
        description: "Get a template with its variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:templateId",
    ({ params, body, user, request, server }) =>
      templateService.update(
        params.id,
        params.templateId,
        body,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: TemplateParamsSchema,
      body: UpdateEnvTemplateBodySchema,
      response: EnvTemplateResponseSchema,
      detail: {
        summary: "Update template",
        description: "Update template name or description.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:templateId",
    ({ params, user, request, server }) =>
      templateService.delete(params.id, params.templateId, user.id, getClientIp(request, server)),
    {
      params: TemplateParamsSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete template",
        description: "Delete a template and all its variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/:templateId/apply",
    ({ params, body, user, request, server }) =>
      templateService.apply(
        params.id,
        params.templateId,
        body,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: TemplateParamsSchema,
      body: ApplyTemplateBodySchema,
      response: ApplyTemplateResponseSchema,
      detail: {
        summary: "Apply template",
        description: "Apply a template to create a new environment with empty-valued variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
