import { Elysia, t } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import {
  EnvExampleResponseSchema,
  ExportEnvVariablesResponseSchema,
  ImportEnvVariablesBodySchema,
  ImportEnvVariablesResponseSchema,
} from "./env-io.schema";
import { EnvironmentIOService } from "./env-io.service";

const environmentIOService = container.resolve(EnvironmentIOService);

const VaultIOParamsSchema = t.Object({ id: t.String(), vaultId: t.String() });

export const envIOController = new Elysia({
  prefix: "/projects/:id/vaults/:vaultId",
  detail: { tags: ["Environment Import/Export"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/example",
    ({ params }) => environmentIOService.generateExample(params.id, params.vaultId),
    {
      params: VaultIOParamsSchema,
      response: EnvExampleResponseSchema,
      detail: {
        operationId: "generateEnvExample",
        summary: "Generate .env.example template",
        description:
          "Generate a .env.example template with keys and placeholder annotations but no real values.",
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .post(
    "/import",
    ({ params, body, projectMember, request, server }) =>
      environmentIOService.bulkImport(
        params.id,
        params.vaultId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: VaultIOParamsSchema,
      body: ImportEnvVariablesBodySchema,
      response: ImportEnvVariablesResponseSchema,
      detail: {
        operationId: "importEnvVariables",
        summary: "Bulk import environment variables into a vault",
        description:
          "Bulk import pre-encrypted environment variables into the target vault. Existing keys are updated.",
      },
    },
  )
  .get(
    "/export",
    ({ params, projectMember, request, server }) =>
      environmentIOService.export(
        params.id,
        params.vaultId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: VaultIOParamsSchema,
      response: ExportEnvVariablesResponseSchema,
      detail: {
        operationId: "exportEnvVariables",
        summary: "Export environment variables from a vault",
        description:
          "Export all encrypted environment variables for a given vault. The client is responsible for decryption and formatting.",
      },
    },
  );
