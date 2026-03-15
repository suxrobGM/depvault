import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
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
  .use(projectGuard("VIEWER"))
  .get(
    "/variables",
    ({ params, query, projectMember, request, server }) =>
      environmentService.list(
        params.id,
        projectMember.userId,
        projectMember.role,
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
        operationId: "listEnvVariables",
        summary: "List environment variables",
        description:
          "List environment variables for a project, optionally filtered by environment type. Viewers see masked values; editors and owners see decrypted values.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/variables/:varId/versions",
    ({ params, projectMember }) =>
      envVariableVersionService.listVersions(params.id, params.varId, projectMember.role),
    {
      params: EnvVariableParamsSchema,
      response: EnvVariableVersionListResponseSchema,
      detail: {
        operationId: "listEnvVariableVersions",
        summary: "List variable version history",
        description:
          "List the version history for an environment variable. Editors and owners see decrypted values; viewers see masked values.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/variables",
    ({ params, body, projectMember, request, server }) =>
      environmentService.create(
        params.id,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: CreateEnvVariableBodySchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        operationId: "createEnvVariable",
        summary: "Create an environment variable",
        description:
          "Create a new encrypted environment variable for the project. The environment is auto-created if it doesn't exist. Only owners and editors can create variables.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/variables/:varId",
    ({ params, body, projectMember, request, server }) =>
      environmentService.update(
        params.id,
        params.varId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableParamsSchema,
      body: UpdateEnvVariableBodySchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        operationId: "updateEnvVariable",
        summary: "Update an environment variable",
        description:
          "Update key, value, or metadata of an environment variable. When the value changes, the previous value is saved as a version snapshot. Only owners and editors can update.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/variables/:varId",
    ({ params, projectMember, request, server }) =>
      environmentService.delete(
        params.id,
        params.varId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteEnvVariable",
        summary: "Delete an environment variable",
        description:
          "Permanently delete an environment variable and all its version history. Only owners and editors can delete.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/variables/:varId/versions/:versionId/rollback",
    ({ params, projectMember }) =>
      envVariableVersionService.rollback(
        params.id,
        params.varId,
        params.versionId,
        projectMember.userId,
      ),
    {
      params: EnvVariableVersionParamsSchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        operationId: "rollbackEnvVariable",
        summary: "Rollback variable to a previous version",
        description:
          "Restore an environment variable to a previous version. The current value is saved as a new version snapshot before rolling back. Only owners and editors can rollback.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
