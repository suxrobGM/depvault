import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  EnvVariableVersionListResponseSchema,
  EnvVariableVersionParamsSchema,
} from "./env-variable-version.schema";
import { EnvVariableVersionService } from "./env-variable-version.service";
import {
  CreateEnvVariableBodySchema,
  EnvVariableListQuerySchema,
  EnvVariableListResponseSchema,
  EnvVariableParamsSchema,
  EnvVariableWithValueResponseSchema,
  UpdateEnvVariableBodySchema,
} from "./env-variable.schema";
import { EnvironmentService } from "./environment.service";

const environmentService = container.resolve(EnvironmentService);
const envVariableVersionService = container.resolve(EnvVariableVersionService);

export const envVariableController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Variables"] },
})
  .use(authGuard)
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
  .get(
    "/variables/:varId/versions",
    ({ params, user }) => envVariableVersionService.listVersions(params.id, params.varId, user.id),
    {
      params: EnvVariableParamsSchema,
      response: EnvVariableVersionListResponseSchema,
      detail: {
        summary: "List variable version history",
        description:
          "List the version history for an environment variable. Editors and owners see decrypted values; viewers see masked values.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/variables/:varId/versions/:versionId/rollback",
    ({ params, user }) =>
      envVariableVersionService.rollback(params.id, params.varId, params.versionId, user.id),
    {
      params: EnvVariableVersionParamsSchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        summary: "Rollback variable to a previous version",
        description:
          "Restore an environment variable to a previous version. The current value is saved as a new version snapshot before rolling back. Only owners and editors can rollback.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
