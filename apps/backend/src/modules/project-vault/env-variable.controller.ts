import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { MessageResponseSchema } from "@/types/response";
import {
  EnvVariableVersionListParamsSchema,
  EnvVariableVersionListResponseSchema,
  EnvVariableVersionParamsSchema,
} from "./env-variable-version.schema";
import { EnvVariableVersionService } from "./env-variable-version.service";
import {
  BatchDeleteEnvVariablesBodySchema,
  BatchDeleteEnvVariablesResponseSchema,
  CreateEnvVariableBodySchema,
  EnvVariableListQuerySchema,
  EnvVariableListResponseSchema,
  EnvVariableParamsSchema,
  EnvVariableVaultParamsSchema,
  EnvVariableWithValueResponseSchema,
  UpdateEnvVariableBodySchema,
} from "./env-variable.schema";
import { EnvVariableService } from "./env-variable.service";

const envVariableService = container.resolve(EnvVariableService);
const envVariableVersionService = container.resolve(EnvVariableVersionService);

export const envVariableController = new Elysia({
  prefix: "/projects/:id/vaults/:vaultId",
  detail: { tags: ["Environment Variables"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/variables",
    ({ params, query, projectMember, request, server }) =>
      envVariableService.list(
        params.id,
        params.vaultId,
        projectMember.userId,
        query.page,
        query.limit,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableVaultParamsSchema,
      query: EnvVariableListQuerySchema,
      response: EnvVariableListResponseSchema,
      detail: {
        operationId: "listEnvVariables",
        summary: "List environment variables in a vault",
        description: "List the environment variables stored in a vault.",
      },
    },
  )
  .get(
    "/variables/:varId/versions",
    ({ params }) => envVariableVersionService.listVersions(params.id, params.vaultId, params.varId),
    {
      params: EnvVariableVersionListParamsSchema,
      response: EnvVariableVersionListResponseSchema,
      detail: {
        operationId: "listEnvVariableVersions",
        summary: "List variable version history",
        description: "List the version history for an environment variable.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/variables",
    ({ params, body, projectMember, request, server }) =>
      envVariableService.create(
        params.id,
        params.vaultId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableVaultParamsSchema,
      body: CreateEnvVariableBodySchema,
      response: EnvVariableWithValueResponseSchema,
      detail: {
        operationId: "createEnvVariable",
        summary: "Create an environment variable",
        description:
          "Create a new encrypted environment variable inside a vault. Only owners and editors can create variables.",
      },
    },
  )
  .put(
    "/variables/:varId",
    ({ params, body, projectMember, request, server }) =>
      envVariableService.update(
        params.id,
        params.vaultId,
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
          "Update key, value, or metadata of an environment variable. When the value changes, the previous non-blank value is saved as a version snapshot.",
      },
    },
  )
  .delete(
    "/variables/:varId",
    ({ params, projectMember, request, server }) =>
      envVariableService.delete(
        params.id,
        params.vaultId,
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
        description: "Permanently delete an environment variable and all its version history.",
      },
    },
  )
  .delete(
    "/variables/batch",
    ({ params, body, projectMember, request, server }) =>
      envVariableService.batchDelete(
        params.id,
        params.vaultId,
        body.variableIds,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: EnvVariableVaultParamsSchema,
      body: BatchDeleteEnvVariablesBodySchema,
      response: BatchDeleteEnvVariablesResponseSchema,
      detail: {
        operationId: "batchDeleteEnvVariables",
        summary: "Batch delete environment variables",
        description:
          "Permanently delete multiple environment variables in a vault and their version history.",
      },
    },
  )
  .post(
    "/variables/:varId/versions/:versionId/rollback",
    ({ params, projectMember }) =>
      envVariableVersionService.rollback(
        params.id,
        params.vaultId,
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
          "Restore an environment variable to a previous version. The current value is saved as a new version snapshot before rolling back.",
      },
    },
  );
