import { Elysia, t } from "elysia";
import { authGuard } from "@/common/middleware/auth.middleware";
import { rateLimiter } from "@/common/middleware/rate-limiter";

export const secretController = new Elysia({
  prefix: "/secrets",
  detail: { tags: ["Secrets"] },
})
  .use(
    new Elysia().use(rateLimiter({ max: 10, windowMs: 60 * 1000 })).get(
      "/:token",
      ({ params }) => {
        // TODO: implement one-time secret access
        return { token: params.token };
      },
      {
        params: t.Object({ token: t.String() }),
        detail: {
          summary: "Access a shared secret",
          description:
            "Retrieve a shared secret by its one-time token. The secret is destroyed after first access and cannot be read again.",
        },
      },
    ),
  )
  .use(
    new Elysia()
      .use(authGuard)
      .use(rateLimiter({ max: 30, windowMs: 60 * 1000 }))
      .get(
        "/:token/download",
        ({ params, user }) => {
          // TODO: implement secret file download
          return { token: params.token, userId: user.id };
        },
        {
          params: t.Object({ token: t.String() }),
          detail: {
            summary: "Download a shared secret file",
            description:
              "Download the file attached to a shared secret. Requires authentication. The file is decrypted in-memory and streamed to the client.",
            security: [{ bearerAuth: [] }],
          },
        },
      ),
  );
