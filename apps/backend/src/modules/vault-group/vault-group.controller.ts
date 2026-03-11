import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
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
  .use(authGuard)
  .get("/", ({ params, user }) => vaultGroupService.list(params.id, user.id), {
    params: StringIdParamSchema,
    response: VaultGroupListResponseSchema,
    detail: {
      summary: "List vault groups",
      description: "List all vault groups for a project with environment and variable counts.",
      security: [{ bearerAuth: [] }],
    },
  })
  .post("/", ({ params, body, user }) => vaultGroupService.create(params.id, body, user.id), {
    params: StringIdParamSchema,
    body: CreateVaultGroupBodySchema,
    response: VaultGroupResponseSchema,
    detail: {
      summary: "Create vault group",
      description:
        "Create a new vault group for organizing environment variables by sub-project or env file.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put(
    "/:groupId",
    ({ params, body, user }) => vaultGroupService.update(params.id, params.groupId, body, user.id),
    {
      params: VaultGroupParamsSchema,
      body: UpdateVaultGroupBodySchema,
      response: VaultGroupResponseSchema,
      detail: {
        summary: "Update vault group",
        description: "Update a vault group's name, description, or sort order.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:groupId",
    ({ params, user }) => vaultGroupService.delete(params.id, params.groupId, user.id),
    {
      params: VaultGroupParamsSchema,
      response: MessageResponseSchema,
      detail: {
        summary: "Delete vault group",
        description:
          "Delete a vault group and all its environments and variables. This action cannot be undone.",
        security: [{ bearerAuth: [] }],
      },
    },
  );
