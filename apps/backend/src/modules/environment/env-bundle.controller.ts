import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { EnvBundleBodySchema, EnvBundleResponseSchema } from "./env-bundle.schema";
import { EnvBundleService } from "./env-bundle.service";

const envBundleService = container.resolve(EnvBundleService);

export const envBundleController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Bundle"] },
})
  .use(projectGuard("EDITOR"))
  .post(
    "/bundle",
    ({ params, body, projectMember, request, server }) =>
      envBundleService.createBundle(
        params.id,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: EnvBundleBodySchema,
      response: EnvBundleResponseSchema,
      detail: {
        operationId: "downloadEnvBundle",
        summary: "Download environment bundle",
        description:
          "Download selected environment variables and secret files as a base64-encoded zip archive. Only owners and editors can download bundles.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
