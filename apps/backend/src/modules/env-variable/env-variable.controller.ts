import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { EnvVariableIOService } from "./env-variable-io.service";
import {
  CreateEnvVariableBodySchema,
  EnvExampleQuerySchema,
  EnvExampleResponseSchema,
  EnvVariableListQuerySchema,
  EnvVariableListResponseSchema,
  EnvVariableParamsSchema,
  EnvVariableWithValueResponseSchema,
  ExportEnvVariablesQuerySchema,
  ExportEnvVariablesResponseSchema,
  ImportEnvVariablesBodySchema,
  ImportEnvVariablesResponseSchema,
  UpdateEnvVariableBodySchema,
} from "./env-variable.schema";
import { EnvVariableService } from "./env-variable.service";

const envVariableService = container.resolve(EnvVariableService);
const envVariableIOService = container.resolve(EnvVariableIOService);

export const envVariableController = new Elysia({
  prefix: "/projects/:id/env-variables",
  detail: { tags: ["Environment Variables"] },
})
  .use(authGuard)
  .post(
    "/",
    ({ params, body, user, request, server }) =>
      envVariableService.create(params.id, body, user.id, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: CreateEnvVariableBodySchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        summary: "Create an environment variable",
        description:
          "Create a new encrypted environment variable for the project. The environment is auto-created if it doesn't exist. Only owners and editors can create variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/",
    ({ params, query, user, request, server }) =>
      envVariableService.list(
        params.id,
        user.id,
        query.environment,
        query.page,
        query.limit,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      query: EnvVariableListQuerySchema,
      response: EnvVariableListResponseSchema,
      detail: {
        summary: "List environment variables",
        description:
          "List environment variables for a project, optionally filtered by environment name. Viewers see masked values; editors and owners see decrypted values.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:varId",
    ({ params, body, user, request, server }) =>
      envVariableService.update(
        params.id,
        params.varId,
        body,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableParamsSchema,
      body: UpdateEnvVariableBodySchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        summary: "Update an environment variable",
        description:
          "Update key, value, or metadata of an environment variable. When the value changes, the previous value is saved as a version snapshot. Only owners and editors can update.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:varId",
    ({ params, user, request, server }) =>
      envVariableService.delete(params.id, params.varId, user.id, getClientIp(request, server)),
    {
      params: EnvVariableParamsSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete an environment variable",
        description:
          "Permanently delete an environment variable and all its version history. Only owners and editors can delete.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/import",
    ({ params, body, user, request, server }) =>
      envVariableIOService.bulkImport(params.id, body, user.id, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: ImportEnvVariablesBodySchema,
      response: ImportEnvVariablesResponseSchema,
      detail: {
        summary: "Bulk import environment variables",
        description:
          "Import environment variables from a config file (.env, appsettings.json, secrets.yaml, config.toml). Existing keys are skipped. Only owners and editors can import.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/export",
    ({ params, query, user, request, server }) =>
      envVariableIOService.export(
        params.id,
        query.environment,
        query.format,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      query: ExportEnvVariablesQuerySchema,
      response: ExportEnvVariablesResponseSchema,
      detail: {
        summary: "Export environment variables",
        description:
          "Export all environment variables for a given environment in the specified format (.env, appsettings.json, secrets.yaml, config.toml). Only owners and editors can export.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/example",
    ({ params, query, user }) =>
      envVariableIOService.generateExample(params.id, query.environment, user.id),
    {
      params: StringIdParamSchema,
      query: EnvExampleQuerySchema,
      response: EnvExampleResponseSchema,
      detail: {
        summary: "Generate .env.example template",
        description:
          "Generate a .env.example template with keys and placeholder annotations but no real values. Any project member can access this.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
