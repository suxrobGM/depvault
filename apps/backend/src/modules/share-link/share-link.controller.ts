import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateShareBodySchema,
  CreateShareResponseSchema,
  ShareLinkListResponseSchema,
  ShareLinkParamsSchema,
} from "./share-link.schema";
import { ShareLinkService } from "./share-link.service";

const shareLinkService = container.resolve(ShareLinkService);

export const shareLinkController = new Elysia({
  prefix: "/projects/:id/shares",
  detail: { tags: ["Share Links"], security: [{ bearerAuth: [] }] },
})
  .use(projectGuard("EDITOR"))
  .use(rateLimiter({ max: 30, windowMs: 60 * 1000 }))
  .post(
    "/",
    ({ params, body, projectMember, request, server }) =>
      shareLinkService.create(params.id, projectMember.userId, body, getClientIp(request, server)),
    {
      params: StringIdParamSchema,
      body: CreateShareBodySchema,
      response: CreateShareResponseSchema,
      detail: {
        operationId: "createShareLink",
        summary: "Create a share link for a file",
        description:
          "Generate a one-time shareable link for a client-encrypted file. Optional password and expiry supported.",
      },
    },
  )
  .get("/", ({ params }) => shareLinkService.list(params.id), {
    params: StringIdParamSchema,
    response: ShareLinkListResponseSchema,
    detail: {
      operationId: "listShareLinks",
      summary: "List share links",
      description:
        "List all share links created for this project with their status (PENDING, VIEWED, EXPIRED).",
    },
  })
  .delete(
    "/:shareId",
    ({ params, projectMember, request, server }) =>
      shareLinkService.revoke(
        params.id,
        params.shareId,
        projectMember.userId,
        getClientIp(request, server),
      ),
    {
      params: ShareLinkParamsSchema,
      response: MessageResponseSchema,
      detail: {
        operationId: "revokeShareLink",
        summary: "Revoke a pending share link",
        description:
          "Permanently delete a pending share link. Already-viewed links cannot be revoked.",
      },
    },
  );
