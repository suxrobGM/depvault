import { Elysia } from "elysia";
import { ForbiddenError } from "@/common/errors";
import { UserRole } from "@/generated/prisma";
import { authGuard } from "./auth.middleware";

/**
 * Role-based access control middleware factory.
 * Chains authGuard for type inference (Elysia deduplicates by plugin name at runtime).
 *
 * Usage:
 *   someRoutes.use(authGuard).use(requireRole("ADMIN")).get(...)
 */
export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `role-${roles.join("-")}` })
    .use(authGuard)
    .onBeforeHandle({ as: "scoped" }, ({ user }) => {
      const userRole = user?.role as UserRole;

      if (userRole === UserRole.SUPER_ADMIN) {
        return;
      }
      if (!roles.includes(userRole)) {
        throw new ForbiddenError("Insufficient permissions");
      }
    });
