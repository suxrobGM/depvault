import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { EnvDiffQuerySchema, EnvDiffResponseSchema } from "./env-diff.schema";
import { EnvironmentDiffService } from "./env-diff.service";

const environmentDiffService = container.resolve(EnvironmentDiffService);

export const envDiffController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environment Diff"], security: [{ bearerAuth: [] }] },
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
          "Compare variable keys across 2-3 environments. Returns rows with match/missing status.",
      },
    },
  );
