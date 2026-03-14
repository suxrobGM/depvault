import { Elysia, t } from "elysia";
import { container } from "@/common/di/container";
import { rateLimiter } from "@/common/middleware/rate-limiter";
import { getClientIp } from "@/common/utils/ip";
import { GoneErrorSchema, TooManyRequestsErrorSchema } from "@/types/response";
import {
  AccessEnvSecretResponseSchema,
  AccessFileSecretResponseSchema,
  AccessSecretBodySchema,
  SharedSecretInfoResponseSchema,
  TokenParamSchema,
} from "./shared-secret.schema";
import { SharedSecretService } from "./shared-secret.service";

const sharedSecretService = container.resolve(SharedSecretService);

export const secretController = new Elysia({
  prefix: "/secrets/shared",
  detail: { tags: ["Shared Secrets"] },
})
  .use(rateLimiter({ max: 10, windowMs: 60 * 1000 }))
  .get("/:token/info", ({ params }) => sharedSecretService.getInfo(params.token), {
    params: TokenParamSchema,
    response: {
      200: SharedSecretInfoResponseSchema,
      ...GoneErrorSchema,
      ...TooManyRequestsErrorSchema,
    },
    detail: {
      summary: "Check shared secret info",
      description:
        "Returns metadata (type, password-protected, expiry) without consuming the secret.",
    },
  })
  .post(
    "/:token",
    ({ params, body, request, server }) =>
      sharedSecretService.access(params.token, body.password, getClientIp(request, server)),
    {
      params: TokenParamSchema,
      body: AccessSecretBodySchema,
      response: {
        200: t.Union([AccessEnvSecretResponseSchema, AccessFileSecretResponseSchema]),
        ...GoneErrorSchema,
        ...TooManyRequestsErrorSchema,
      },
      detail: {
        summary: "Access a one-time shared secret",
        description:
          "Retrieve and permanently consume a shared secret. Content is destroyed after this call — no second access is possible.",
      },
    },
  );
