import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";

@singleton()
export class EnvironmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateEnvironment(projectId: string, vaultGroupId: string, type: EnvironmentType) {
    const existing = await this.prisma.environment.findUnique({
      where: { vaultGroupId_type: { vaultGroupId, type } },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: { projectId, vaultGroupId, type },
    });
  }

  /** Look up a vault group's display name by ID. */
  async getVaultGroupName(vaultGroupId: string): Promise<string> {
    const group = await this.prisma.vaultGroup.findUnique({
      where: { id: vaultGroupId },
      select: { name: true },
    });
    return group?.name ?? "Unknown";
  }

  async requireEnvironment(vaultGroupId: string, type: EnvironmentType) {
    const env = await this.prisma.environment.findUnique({
      where: { vaultGroupId_type: { vaultGroupId, type } },
    });

    if (!env) {
      throw new NotFoundError(`Environment "${type}" not found`);
    }

    return env;
  }
}
