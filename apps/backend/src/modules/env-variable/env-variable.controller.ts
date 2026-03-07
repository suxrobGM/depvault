import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateEnvVariableBodySchema,
  EnvVariableListQuerySchema,
  EnvVariableListResponseSchema,
  EnvVariableParamsSchema,
  EnvVariableWithValueResponseSchema,
  UpdateEnvVariableBodySchema,
} from "./env-variable.schema";
import { EnvVariableService } from "./env-variable.service";

const envVariableService = container.resolve(EnvVariableService);

export const envVariableController = new Elysia({
  prefix: "/projects/:id/env-variables",
  detail: { tags: ["Environment Variables"] },
})
  .use(authGuard)
  .post("/", ({ params, body, user }) => envVariableService.create(params.id, body, user.id), {
    params: StringIdParamSchema,
    body: CreateEnvVariableBodySchema,
    response: EnvVariableWithValueResponseSchema,
    detail: {
      summary: "Create an environment variable",
      description:
        "Create a new encrypted environment variable for the project. The environment is auto-created if it doesn't exist. Only owners and editors can create variables.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get(
    "/",
    ({ params, query, user }) =>
      envVariableService.list(params.id, user.id, query.environment, query.page, query.limit),
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
    ({ params, body, user }) => envVariableService.update(params.id, params.varId, body, user.id),
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
    ({ params, user }) => envVariableService.delete(params.id, params.varId, user.id),
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
  );
