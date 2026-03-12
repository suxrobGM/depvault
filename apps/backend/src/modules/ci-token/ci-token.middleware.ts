import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { UnauthorizedError } from "@/common/errors";
import { getClientIp } from "@/common/utils/ip";
import { CiTokenService } from "./ci-token.service";

/** Validates a CI token from Authorization header or query param and injects context. */
export const ciTokenGuard = new Elysia({ name: "ci-token-guard" }).derive(
  { as: "scoped" },
  async ({ headers, query, request, server }) => {
    const rawToken = extractCiToken(headers, query);

    if (!rawToken) {
      throw new UnauthorizedError("Missing CI token");
    }

    const ciTokenService = container.resolve(CiTokenService);
    const clientIp = getClientIp(request, server);
    const ciToken = await ciTokenService.validateToken(rawToken, clientIp);

    return { ciToken, rawToken, clientIp };
  },
);

function extractCiToken(
  headers: Record<string, string | undefined>,
  query: Record<string, string>,
): string | null {
  const authorization = headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  if (query.token) {
    return query.token;
  }

  return null;
}
