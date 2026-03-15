import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateVaultGroupBodySchema,
  UpdateVaultGroupBodySchema,
  VaultGroupListResponseSchema,
  VaultGroupParamsSchema,
  VaultGroupResponseSchema,
} from "./vault-group.schema";
import { VaultGroupService } from "./vault-group.service";

const vaultGroupService = container.resolve(VaultGroupService);

export const vaultGroupController = new Elysia({
  prefix: "/projects/:id/vault-groups",
  detail: { tags: ["Vault Groups"] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params }) => vaultGroupService.list(params.id), {
    params: StringIdParamSchema,
    response: VaultGroupListResponseSchema,
    detail: {
      operationId: "listVaultGroups",
      summary: "List vault groups",
      description: "List all vault groups for a project with environment and variable counts.",
      security: [{ bearerAuth: [] }],
    },
  })
  .use(projectGuard("EDITOR"))
  .post("/", ({ params, body }) => vaultGroupService.create(params.id, body), {
    params: StringIdParamSchema,
    body: CreateVaultGroupBodySchema,
    response: VaultGroupResponseSchema,
    detail: {
      operationId: "createVaultGroup",
      summary: "Create vault group",
      description:
        "Create a new vault group for organizing environment variables by sub-project or env file.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put(
    "/:groupId",
    ({ params, body }) => vaultGroupService.update(params.id, params.groupId, body),
    {
      params: VaultGroupParamsSchema,
      body: UpdateVaultGroupBodySchema,
      response: VaultGroupResponseSchema,
      detail: {
        operationId: "updateVaultGroup",
        summary: "Update vault group",
        description: "Update a vault group's name, description, or sort order.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete("/:groupId", ({ params }) => vaultGroupService.delete(params.id, params.groupId), {
    params: VaultGroupParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteVaultGroup",
      summary: "Delete vault group",
      description:
        "Delete a vault group and all its environments and variables. This action cannot be undone.",
      security: [{ bearerAuth: [] }],
    },
  });
