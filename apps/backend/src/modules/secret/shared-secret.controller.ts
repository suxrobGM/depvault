import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateEnvShareBodySchema,
  CreateFileShareBodySchema,
  CreateShareResponseSchema,
  SharedSecretAuditListResponseSchema,
  SharedSecretParamsSchema,
} from "./shared-secret.schema";
import { SharedSecretService } from "./shared-secret.service";

const sharedSecretService = container.resolve(SharedSecretService);

export const sharedSecretController = new Elysia({
  prefix: "/projects/:id/secrets/shared",
  detail: { tags: ["Shared Secrets"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("EDITOR"))
  .use(rateLimiter({ max: 30, windowMs: 60 * 1000 }))
  .post(
    "/env",
    ({ params, body, projectMember, request, server }) =>
      sharedSecretService.createForEnvVariables(
        params.id,
        projectMember.userId,
        body,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: CreateEnvShareBodySchema,
      response: CreateShareResponseSchema,
      detail: {
        operationId: "shareEnvVariables",
        summary: "Create a share link for environment variables",
        description:
          "Generate a one-time shareable link for one or more environment variables. Optional password and expiry supported.",
      },
    },
  )
  .post(
    "/file",
    ({ params, body, projectMember, request, server }) =>
      sharedSecretService.createForFile(
        params.id,
        projectMember.userId,
        body,
        getClientIp(request, server),
      ),
    {
      params: StringIdParamSchema,
      body: CreateFileShareBodySchema,
      response: CreateShareResponseSchema,
      detail: {
        operationId: "shareSecretFile",
        summary: "Create a share link for a secret file",
        description:
          "Generate a one-time shareable link for a client-encrypted secret file. Optional password and expiry supported.",
      },
    },
  )
  .get("/", ({ params }) => sharedSecretService.list(params.id), {
    params: StringIdParamSchema,
    response: SharedSecretAuditListResponseSchema,
    detail: {
      operationId: "listSharedSecrets",
      summary: "List shared secret links",
      description:
        "List all share links created for this project with their status (PENDING, VIEWED, EXPIRED).",
    },
  })
  .delete(
    "/:secretId",
    ({ params, projectMember, request, server }) =>
      sharedSecretService.revoke(
        params.id,
        params.secretId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: SharedSecretParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "revokeSharedSecret",
        summary: "Revoke a pending share link",
        description:
          "Permanently delete a pending share link. Already-viewed links cannot be revoked.",
      },
    },
  );
