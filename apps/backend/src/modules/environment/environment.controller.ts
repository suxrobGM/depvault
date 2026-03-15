import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  DeleteEnvironmentParamsSchema,
  EnvironmentListQuerySchema,
  EnvironmentListResponseSchema,
} from "./environment.schema";
import { EnvironmentService } from "./environment.service";

const environmentService = container.resolve(EnvironmentService);

export const environmentController = new Elysia({
  prefix: "/projects/:id/environments",
  detail: { tags: ["Environments"] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/",
    ({ params, query }) => environmentService.listEnvironments(params.id, query.vaultGroupId),
    {
      params: StringIdParamSchema,
      query: EnvironmentListQuerySchema,
      response: EnvironmentListResponseSchema,
      detail: {
        operationId: "listEnvironments",
        summary: "List environments",
        description: "List all environments for a project with variable counts.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .use(projectGuard("EDITOR"))
  .delete(
    "/:envId",
    ({ params, projectMember, request, server }) =>
      environmentService.deleteEnvironment(
        params.id,
        params.envId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: DeleteEnvironmentParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteEnvironment",
        summary: "Delete an environment",
        description:
          "Permanently delete an environment and all its variables. Only owners and editors can delete.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
