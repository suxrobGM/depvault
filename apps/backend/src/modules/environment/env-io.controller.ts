import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { EnvironmentIOService } from "./env-io.service";
import {
  EnvExampleQuerySchema,
  EnvExampleResponseSchema,
  ExportEnvVariablesQuerySchema,
  ExportEnvVariablesResponseSchema,
  ImportEnvVariablesBodySchema,
  ImportEnvVariablesResponseSchema,
} from "./env-variable.schema";

const environmentIOService = container.resolve(EnvironmentIOService);

export const envIOController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Import/Export"] },
})
  .use(authGuard)
  .post(
    "/import",
    ({ params, body, user, request, server }) =>
      environmentIOService.bulkImport(params.id, body, user.id, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: ImportEnvVariablesBodySchema,
      response: ImportEnvVariablesResponseSchema,
      detail: {
        operationId: "importEnvVariables",
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
        operationId: "exportEnvVariables",
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
        operationId: "generateEnvExample",
        summary: "Generate .env.example template",
        description:
          "Generate a .env.example template with keys and placeholder annotations but no real values. Any project member can access this.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
