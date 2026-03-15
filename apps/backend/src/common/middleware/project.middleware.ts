import { PROJECT_ROLE_LEVEL } from "@depvault/shared/constants";
import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient, ProjectRole } from "@/generated/prisma";
import { extractToken, verifyToken } from "./auth.middleware";

const prisma = container.resolve(PrismaClient);

/**
 * Project-level role guard.
 * Verifies JWT, resolves the project member from `params.id`,
 * and injects `user` + `projectMember` into the request context.
 *
 * Uses its own JWT instance (named per role) to avoid Elysia plugin
 * deduplication when multiple guards are used on the same controller.
 *
 * Usage:
 *   .use(projectGuard("VIEWER"))   // any member
 *   .use(projectGuard("EDITOR"))   // editor or owner
 *   .use(projectGuard("OWNER"))    // owner only
 */
export const projectGuard = (minRole: ProjectRole = "VIEWER") =>
  new Elysia({ name: `project-guard-${minRole}` })
    .use(jwt({ name: `jwt-${minRole}`, secret: process.env.JWT_SECRET! }))
    .derive({ as: "scoped" }, async ({ headers, cookie, ...ctx }) => {
      const jwtProvider = (ctx as Record<string, any>)[`jwt-${minRole}`];
      const projectId = ((ctx as any).params as Record<string, string>).id!;

      const token = extractToken(headers, cookie as any);
      const user = await verifyToken(jwtProvider, token);

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });

      if (!member) {
        throw new NotFoundError("Project not found");
      }

      const memberLevel = PROJECT_ROLE_LEVEL[member.role] ?? 0;
      const requiredLevel = PROJECT_ROLE_LEVEL[minRole];

      if (memberLevel < requiredLevel) {
        throw new ForbiddenError("Insufficient project permissions");
      }

      return {
        user,
        projectMember: {
          id: member.id,
          projectId: member.projectId,
          userId: member.userId,
          role: member.role,
        },
      };
    });
