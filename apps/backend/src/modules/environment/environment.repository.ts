import { singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { EnvironmentType, PrismaClient, ProjectRole } from "@/generated/prisma";

@singleton()
export class EnvironmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateEnvironment(
    projectId: string,
    vaultGroupId: string,
    name: string,
    type?: string,
  ) {
    const existing = await this.prisma.environment.findUnique({
      where: { vaultGroupId_name: { vaultGroupId, name } },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: {
        projectId,
        vaultGroupId,
        name,
        type: (type as EnvironmentType) ?? EnvironmentType.DEVELOPMENT,
      },
    });
  }

  async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    return member;
  }

  async requireEditorOrOwner(projectId: string, userId: string) {
    const member = await this.requireMember(projectId, userId);

    if (member.role !== ProjectRole.OWNER && member.role !== ProjectRole.EDITOR) {
      throw new ForbiddenError("Only owners and editors can modify environment variables");
    }

    return member;
  }

  async requireEnvironment(vaultGroupId: string, environmentName: string) {
    const env = await this.prisma.environment.findUnique({
      where: { vaultGroupId_name: { vaultGroupId, name: environmentName } },
    });

    if (!env) {
      throw new NotFoundError(`Environment "${environmentName}" not found`);
    }

    return env;
  }
}
