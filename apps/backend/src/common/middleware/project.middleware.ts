import { PROJECT_ROLE_LEVEL } from "@depvault/shared/constants";
import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { PrismaClient, ProjectRole } from "@/generated/prisma";
import { authGuard } from "./auth.middleware";

const prisma = container.resolve(PrismaClient);

/**
 * Project-level role guard.
 * Chains authGuard, resolves the project member from `params.id`,
 * and injects `projectMember` into the request context.
 *
 * Usage:
 *   .use(projectGuard("VIEWER"))   // any member
 *   .use(projectGuard("EDITOR"))   // editor or owner
 *   .use(projectGuard("OWNER"))    // owner only
 */
export const projectGuard = (minRole: ProjectRole = "VIEWER") =>
  new Elysia({ name: `project-guard-${minRole}` })
    .use(authGuard)
    .derive({ as: "scoped" }, async ({ user, params }) => {
      const projectId = (params as Record<string, string>).id!;

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user!.id } },
      });

      if (!member) {
        throw new NotFoundError("Project not found");
      }

      const memberLevel = PROJECT_ROLE_LEVEL[member.role as ProjectRole] ?? 0;
      const requiredLevel = PROJECT_ROLE_LEVEL[minRole];

      if (memberLevel < requiredLevel) {
        throw new ForbiddenError("Insufficient project permissions");
      }

      return {
        projectMember: {
          id: member.id,
          projectId: member.projectId,
          userId: member.userId,
          role: member.role as ProjectRole,
        },
      };
    });
