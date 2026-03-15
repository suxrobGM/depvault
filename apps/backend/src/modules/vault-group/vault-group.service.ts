import { singleton } from "tsyringe";
import { ConflictError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type {
  CreateVaultGroupBody,
  UpdateVaultGroupBody,
  VaultGroupResponse,
} from "./vault-group.schema";

@singleton()
export class VaultGroupService {
  constructor(private readonly prisma: PrismaClient) {}

  /** List all vault groups for a project with environment and variable counts. */
  async list(projectId: string): Promise<VaultGroupResponse[]> {
    const groups = await this.prisma.vaultGroup.findMany({
      where: { projectId },
      include: {
        environments: {
          include: { _count: { select: { variables: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      directoryPath: g.directoryPath,
      sortOrder: g.sortOrder,
      environmentCount: g.environments.length,
      variableCount: g.environments.reduce((sum, e) => sum + e._count.variables, 0),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  /** Create a new vault group for a project. */
  async create(projectId: string, body: CreateVaultGroupBody): Promise<VaultGroupResponse> {
    const existing = await this.prisma.vaultGroup.findUnique({
      where: { projectId_name: { projectId, name: body.name } },
    });

    if (existing) {
      throw new ConflictError(`Vault group "${body.name}" already exists`);
    }

    const maxOrder = await this.prisma.vaultGroup.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });

    const group = await this.prisma.vaultGroup.create({
      data: {
        projectId,
        name: body.name,
        description: body.description,
        directoryPath: body.directoryPath,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      directoryPath: group.directoryPath,
      sortOrder: group.sortOrder,
      environmentCount: 0,
      variableCount: 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /** Update a vault group's name, description, or sort order. */
  async update(
    projectId: string,
    groupId: string,
    body: UpdateVaultGroupBody,
  ): Promise<VaultGroupResponse> {
    const group = await this.requireGroup(projectId, groupId);

    if (body.name && body.name !== group.name) {
      const duplicate = await this.prisma.vaultGroup.findUnique({
        where: { projectId_name: { projectId, name: body.name } },
      });
      if (duplicate) {
        throw new ConflictError(`Vault group "${body.name}" already exists`);
      }
    }

    const updated = await this.prisma.vaultGroup.update({
      where: { id: groupId },
      data: {
        name: body.name,
        description: body.description,
        directoryPath: body.directoryPath,
        sortOrder: body.sortOrder,
      },
      include: {
        environments: {
          include: { _count: { select: { variables: true } } },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      directoryPath: updated.directoryPath,
      sortOrder: updated.sortOrder,
      environmentCount: updated.environments.length,
      variableCount: updated.environments.reduce((sum, e) => sum + e._count.variables, 0),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /** Delete a vault group and all its environments (cascading). */
  async delete(projectId: string, groupId: string): Promise<{ message: string }> {
    const group = await this.requireGroup(projectId, groupId);

    await this.prisma.vaultGroup.delete({ where: { id: groupId } });

    return { message: `Vault group "${group.name}" deleted` };
  }

  private async requireGroup(projectId: string, groupId: string) {
    const group = await this.prisma.vaultGroup.findFirst({
      where: { id: groupId, projectId },
    });

    if (!group) {
      throw new NotFoundError("Vault group not found");
    }

    return group;
  }
}
