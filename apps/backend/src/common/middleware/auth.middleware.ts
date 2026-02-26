import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { UnauthorizedError } from "@/common/errors";

/**
 * JWT auth guard plugin.
 * Derives `user` (id, role, email) into the Elysia request context.
 *
 * Usage:
 *   someRoutes.use(authGuard).get("/protected", ({ user }) => { ... })
 */
export const authGuard = new Elysia({ name: "auth-guard" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .derive({ as: "scoped" }, async ({ headers, jwt }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authorization.slice(7);
    const payload = await jwt.verify(token);

    if (!payload) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    return {
      user: {
        id: payload.sub as string,
        role: payload.role as string,
        email: payload.email as string,
      },
    };
  });
