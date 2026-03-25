import { Elysia, t } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware/project.middleware";
import { KeyGrantService } from "./key-grant.service";
import {
  BatchUpdateGrantsBodySchema,
  CreateKeyGrantBodySchema,
  KeyGrantResponseSchema,
  MessageResponseSchema,
  PendingGrantMemberSchema,
} from "./vault.schema";

const keyGrantService = container.resolve(KeyGrantService);

export const keyGrantController = new Elysia({
  prefix: "/projects/:id/key-grants",
  detail: { tags: ["Key Grants"] },
})
  .use(projectGuard("VIEWER"))
  .get(
    "/mine",
    ({ user, projectMember }) => keyGrantService.getForUser(projectMember.projectId, user.id),
    {
      response: KeyGrantResponseSchema,
      detail: {
        operationId: "getMyKeyGrant",
        summary: "Get my key grant",
        description: "Get the current user's wrapped DEK for this project.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/pending",
    ({ projectMember }) => keyGrantService.getPendingMembers(projectMember.projectId),
    {
      response: t.Array(PendingGrantMemberSchema),
      detail: {
        operationId: "getPendingKeyGrants",
        summary: "List members needing key grants",
        description: "List project members who do not yet have a key grant.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post("/", ({ projectMember, body }) => keyGrantService.create(projectMember.projectId, body), {
    body: CreateKeyGrantBodySchema,
    response: KeyGrantResponseSchema,
    detail: {
      operationId: "createKeyGrant",
      summary: "Create key grant",
      description: "Store a wrapped DEK for a project member.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put("/batch", ({ user, body }) => keyGrantService.batchUpdateForUser(user.id, body), {
    body: BatchUpdateGrantsBodySchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "batchUpdateKeyGrants",
      summary: "Batch update key grants",
      description: "Update multiple key grants at once (used during vault password change).",
      security: [{ bearerAuth: [] }],
    },
  });
