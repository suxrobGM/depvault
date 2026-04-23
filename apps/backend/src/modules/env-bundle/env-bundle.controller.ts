import { Elysia, t } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { EnvBundleBodySchema, EnvBundleResponseSchema } from "./env-bundle.schema";
import { EnvBundleService } from "./env-bundle.service";

const envBundleService = container.resolve(EnvBundleService);

const VaultBundleParamsSchema = t.Object({ id: t.String(), vaultId: t.String() });

export const envBundleController = new Elysia({
  prefix: "/projects/:id/vaults/:vaultId",
  detail: { tags: ["Environment Bundle"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("EDITOR"))
  .post(
    "/bundle",
    ({ params, body, projectMember, request, server }) =>
      envBundleService.createBundle(
        params.id,
        params.vaultId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: VaultBundleParamsSchema,
      body: EnvBundleBodySchema,
      response: EnvBundleResponseSchema,
      detail: {
        operationId: "downloadEnvBundle",
        summary: "Download encrypted bundle for a vault",
        description:
          "Return encrypted environment variables and secret files for client-side decryption and bundling.",
      },
    },
  );
