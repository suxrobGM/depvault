import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { UnauthorizedError } from "@/common/errors";

export interface JwtPayload {
  id: string; // user ID
  role: string; // user role (e.g. "USER", "ADMIN")
  email: string; // user email
}

/** Extracts a Bearer token from the Authorization header or access_token cookie. */
export function extractToken(
  headers: Record<string, string | undefined>,
  cookie: Record<string, { value?: string }>,
): string {
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

  return token;
}

/** Verifies a JWT and returns the decoded user payload. */
export async function verifyToken(
  jwtProvider: { verify: (token: string) => Promise<any> },
  token: string,
): Promise<JwtPayload> {
  const payload = await jwtProvider.verify(token);

  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
  };
}

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
    const token = extractToken(headers, cookie as any);
    const user = await verifyToken(jwt, token);
    return { user };
  });
