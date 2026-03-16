import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { EnvironmentDiffService } from "./env-diff.service";
import { EnvironmentSyncService } from "./env-sync.service";
import {
  EnvDiffQuerySchema,
  EnvDiffResponseSchema,
  SyncEnvironmentBodySchema,
  SyncEnvironmentResponseSchema,
} from "./environment.schema";

const environmentDiffService = container.resolve(EnvironmentDiffService);
const environmentSyncService = container.resolve(EnvironmentSyncService);

export const envDiffController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Diff & Clone"] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/diff",
    ({ params, query, projectMember, request, server }) =>
      environmentDiffService.diff(
        params.id,
        query.vaultGroupId,
        query.environments,
        projectMember.userId,
        projectMember.role,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      query: EnvDiffQuerySchema,
      response: EnvDiffResponseSchema,
      detail: {
        operationId: "diffEnvironments",
        summary: "Diff environments",
        description:
          "Compare variables across 2-3 environments. Returns rows with match/mismatch/missing status.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
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
        security: [{ bearerAuth: [] }],
      },
    },
  );
