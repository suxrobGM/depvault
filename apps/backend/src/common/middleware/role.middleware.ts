import { Elysia } from "elysia";
import { ForbiddenError } from "@/common/errors";
import { UserRole } from "@/generated/prisma";

/**
 * Role-based access control guard.
 * Must be used AFTER authGuard on the same Elysia instance so `user` is in context.
 *
 * Usage:
 *   controller.use(authGuard).use(requireRole("ADMIN")).get(...)
 */
export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `role-${roles.join("-")}` }).onBeforeHandle({ as: "scoped" }, (context) => {
    const user = (context as unknown as { user?: { role?: string } }).user;
    const userRole = user?.role as UserRole | null;

    if (!userRole) {
      throw new ForbiddenError("Authentication required");
    }

    if (userRole === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!roles.includes(userRole)) {
      throw new ForbiddenError(
        `Insufficient permissions (have: ${userRole}, need: ${roles.join(" | ")})`,
      );
    }
  });
