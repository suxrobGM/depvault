import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
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
  detail: { tags: ["Environment Import/Export"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/example",
    ({ query }) => environmentIOService.generateExample(query.vaultGroupId, query.environmentType),
    {
      params: StringIdParamSchema,
      query: EnvExampleQuerySchema,
      response: EnvExampleResponseSchema,
      detail: {
        operationId: "generateEnvExample",
        summary: "Generate .env.example template",
        description:
          "Generate a .env.example template with keys and placeholder annotations but no real values. Any project member can access this.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/import",
    ({ params, body, projectMember, request, server }) =>
      environmentIOService.bulkImport(
        params.id,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: ImportEnvVariablesBodySchema,
      response: ImportEnvVariablesResponseSchema,
      detail: {
        operationId: "importEnvVariables",
        summary: "Bulk import environment variables",
        description:
          "Bulk import pre-encrypted environment variables. The client encrypts values before sending. Existing keys are updated. Only owners and editors can import.",
      },
    },
  )
  .get(
    "/export",
    ({ params, query, projectMember, request, server }) =>
      environmentIOService.export(
        params.id,
        query.vaultGroupId,
        query.environmentType,
        projectMember.userId,
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
          "Export all encrypted environment variables for a given environment. The client is responsible for decryption and formatting. Only owners and editors can export.",
      },
    },
  );
