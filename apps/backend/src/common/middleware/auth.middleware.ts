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
  .derive({ as: "scoped" }, async ({ headers, cookie, jwt }) => {
    const authorization = headers.authorization;
    const cookieToken = cookie.access_token?.value;

    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : typeof cookieToken === "string"
        ? cookieToken
        : undefined;

    if (!token) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }
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
