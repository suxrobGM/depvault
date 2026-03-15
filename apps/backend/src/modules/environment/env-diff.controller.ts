import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { EnvironmentCloneService } from "./env-clone.service";
import { EnvironmentDiffService } from "./env-diff.service";
import {
  CloneEnvironmentBodySchema,
  CloneEnvironmentResponseSchema,
  EnvDiffQuerySchema,
  EnvDiffResponseSchema,
} from "./environment.schema";

const environmentDiffService = container.resolve(EnvironmentDiffService);
const environmentCloneService = container.resolve(EnvironmentCloneService);

export const envDiffController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Diff & Clone"] },
})
  .use(authGuard)
  .get(
    "/diff",
    ({ params, query, user, request, server }) =>
      environmentDiffService.diff(
        params.id,
        query.vaultGroupId,
        query.environments,
        user.id,
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
  .post(
    "/clone",
    ({ params, body, user, request, server }) =>
      environmentCloneService.cloneEnvironment(
        params.id,
        body,
        user.id,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: CloneEnvironmentBodySchema,
      response: CloneEnvironmentResponseSchema,
      detail: {
        operationId: "cloneEnvironment",
        summary: "Clone environment",
        description:
          "Clone an environment's variables (keys, values, and metadata) into a new environment.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
