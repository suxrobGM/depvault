import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { SyncEnvironmentBodySchema, SyncEnvironmentResponseSchema } from "./env-sync.schema";
import { EnvironmentSyncService } from "./env-sync.service";

const environmentSyncService = container.resolve(EnvironmentSyncService);

export const envSyncController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Sync"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("EDITOR"))
  .post(
    "/sync",
    ({ params, body, projectMember, request, server }) =>
      environmentSyncService.syncEnvironment(
        params.id,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: SyncEnvironmentBodySchema,
      response: SyncEnvironmentResponseSchema,
      detail: {
        operationId: "syncEnvironment",
        summary: "Sync environment",
        description:
          "Sync an environment's variables into another environment. Existing keys are overwritten, new keys are added.",
      },
    },
  );
