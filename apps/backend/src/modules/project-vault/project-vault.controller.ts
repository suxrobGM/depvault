import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CloneVaultBodySchema,
  CreateVaultBodySchema,
  UpdateVaultBodySchema,
  VaultListResponseSchema,
  VaultParamsSchema,
  VaultResponseSchema,
  VaultTagListResponseSchema,
} from "./project-vault.schema";
import { ProjectVaultService } from "./project-vault.service";

const projectVaultService = container.resolve(ProjectVaultService);

export const projectVaultController = new Elysia({
  prefix: "/projects/:id",
  detail: { tags: ["Vaults"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("VIEWER"))
  .get("/vaults", ({ params }) => projectVaultService.list(params.id), {
    params: StringIdParamSchema,
    response: VaultListResponseSchema,
    detail: {
      operationId: "listVaults",
      summary: "List project vaults",
      description:
        "List every vault in the project with variable/secret-file counts and required-filled progress.",
    },
  })
  .get("/vault-tags", ({ params }) => projectVaultService.listTags(params.id), {
    params: StringIdParamSchema,
    response: VaultTagListResponseSchema,
    detail: {
      operationId: "listVaultTags",
      summary: "List distinct vault tags",
      description: "Return the distinct tag values across every vault in the project, sorted.",
    },
  })
  .use(projectGuard("EDITOR"))
  .post("/vaults", ({ params, body }) => projectVaultService.create(params.id, body), {
    params: StringIdParamSchema,
    body: CreateVaultBodySchema,
    response: VaultResponseSchema,
    detail: {
      operationId: "createVault",
      summary: "Create a vault",
      description:
        "Create a new vault under the project. Names are unique within a project. Tags are freeform.",
    },
  })
  .put(
    "/vaults/:vaultId",
    ({ params, body }) => projectVaultService.update(params.id, params.vaultId, body),
    {
      params: VaultParamsSchema,
      body: UpdateVaultBodySchema,
      response: VaultResponseSchema,
      detail: {
        operationId: "updateVault",
        summary: "Update a vault",
        description: "Update a vault's name, directory path, or tags.",
      },
    },
  )
  .delete(
    "/vaults/:vaultId",
    ({ params }) => projectVaultService.delete(params.id, params.vaultId),
    {
      params: VaultParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "deleteVault",
        summary: "Delete a vault",
        description:
          "Delete a vault and cascade-delete all of its variables, secret files, and CI tokens.",
      },
    },
  )
  .post(
    "/vaults/:vaultId/clone",
    ({ params, body, projectMember, request, server }) =>
      projectVaultService.clone(
        params.id,
        params.vaultId,
        body,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: VaultParamsSchema,
      body: CloneVaultBodySchema,
      response: VaultResponseSchema,
      detail: {
        operationId: "cloneVault",
        summary: "Clone a vault's keyset with blank values",
        description:
          "Create a new vault with the same keys, descriptions, required flags, directory path, and tags as the source. Values are blank so the new vault starts at 0 of N required filled.",
      },
    },
  );
