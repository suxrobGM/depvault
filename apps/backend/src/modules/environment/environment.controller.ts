import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import { EnvironmentCloneService } from "./environment-clone.service";
import { EnvironmentDiffService } from "./environment-diff.service";
import { EnvironmentIOService } from "./environment-io.service";
import {
  CloneEnvironmentBodySchema,
  CloneEnvironmentResponseSchema,
  CreateEnvVariableBodySchema,
  EnvDiffQuerySchema,
  EnvDiffResponseSchema,
  EnvExampleQuerySchema,
  EnvExampleResponseSchema,
  EnvironmentListQuerySchema,
  EnvironmentListResponseSchema,
  EnvVariableListQuerySchema,
  EnvVariableListResponseSchema,
  EnvVariableParamsSchema,
  EnvVariableWithValueResponseSchema,
  ExportEnvVariablesQuerySchema,
  ExportEnvVariablesResponseSchema,
  ImportEnvVariablesBodySchema,
  ImportEnvVariablesResponseSchema,
  UpdateEnvVariableBodySchema,
} from "./environment.schema";
import { EnvironmentService } from "./environment.service";

const environmentService = container.resolve(EnvironmentService);
const environmentDiffService = container.resolve(EnvironmentDiffService);
const environmentCloneService = container.resolve(EnvironmentCloneService);
const environmentIOService = container.resolve(EnvironmentIOService);

export const environmentController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environments"] },
})
  .use(authGuard)
  .get(
    "/",
    ({ params, query, user }) =>
      environmentService.listEnvironments(params.id, user.id, query.vaultGroupId),
    {
      params: StringIdParamSchema,
      query: EnvironmentListQuerySchema,
      response: EnvironmentListResponseSchema,
      detail: {
        summary: "List environments",
        description: "List all environments for a project with variable counts.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/diff",
    ({ params, query, user, request, server }) =>
      environmentDiffService.diff(
        params.id,
        query.vaultGroupId,
        query.environments,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      query: EnvDiffQuerySchema,
      response: EnvDiffResponseSchema,
      detail: {
        summary: "Diff environments",
        description:
          "Compare variables across 2-3 environments. Returns rows with match/mismatch/missing status.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/clone",
    ({ params, body, user, request, server }) =>
      environmentCloneService.cloneEnvironment(
        params.id,
        body,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: CloneEnvironmentBodySchema,
      response: CloneEnvironmentResponseSchema,
      detail: {
        summary: "Clone environment",
        description:
          "Clone an environment's variable structure into a new environment. Values are left empty.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/variables",
    ({ params, body, user, request, server }) =>
      environmentService.create(params.id, body, user.id, getClientIp(request, server)),
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
    "/variables",
    ({ params, query, user, request, server }) =>
      environmentService.list(
        params.id,
        user.id,
        query.vaultGroupId,
        query.environmentType,
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
          "List environment variables for a project, optionally filtered by environment type. Viewers see masked values; editors and owners see decrypted values.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/variables/:varId",
    ({ params, body, user, request, server }) =>
      environmentService.update(
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
    "/variables/:varId",
    ({ params, user, request, server }) =>
      environmentService.delete(params.id, params.varId, user.id, getClientIp(request, server)),
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
      environmentIOService.bulkImport(params.id, body, user.id, getClientIp(request, server)),
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
      environmentIOService.export(
        params.id,
        query.vaultGroupId,
        query.environmentType,
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
      environmentIOService.generateExample(
        params.id,
        query.vaultGroupId,
        query.environmentType,
        user.id,
      ),
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
