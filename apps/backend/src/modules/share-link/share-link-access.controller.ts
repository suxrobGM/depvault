import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { GoneErrorSchema, TooManyRequestsErrorSchema } from "@/types/response";
import {
  AccessShareBodySchema,
  AccessShareResponseSchema,
  ShareLinkInfoResponseSchema,
  TokenParamSchema,
} from "./share-link.schema";
import { ShareLinkService } from "./share-link.service";

const shareLinkService = container.resolve(ShareLinkService);

export const shareLinkAccessController = new Elysia({
  prefix: "/shares",
  detail: { tags: ["Share Links"] },
})
  .use(rateLimiter({ max: 60, windowMs: 60 * 1000 }))
  .get("/:token/info", ({ params }) => shareLinkService.getInfo(params.token), {
    params: TokenParamSchema,
    response: {
      200: ShareLinkInfoResponseSchema,
      ...GoneErrorSchema,
      ...TooManyRequestsErrorSchema,
    },
    detail: {
      operationId: "getShareLinkInfo",
      summary: "Check share link info",
      description:
        "Returns metadata (file name, password-protected, expiry) without consuming the share link.",
    },
  })
  .post(
    "/:token",
    ({ params, body, request, server }) =>
      shareLinkService.access(params.token, body.password, getClientIp(request, server)),
    {
      params: TokenParamSchema,
      body: AccessShareBodySchema,
      response: {
        200: AccessShareResponseSchema,
        ...GoneErrorSchema,
        ...TooManyRequestsErrorSchema,
      },
      detail: {
        operationId: "accessShareLink",
        summary: "Access a one-time share link",
        description:
          "Retrieve and permanently consume a share link. Content is destroyed after this call — no second access is possible.",
      },
    },
  );
