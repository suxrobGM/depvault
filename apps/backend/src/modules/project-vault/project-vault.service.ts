import { singleton } from "tsyringe";
import { ConflictError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { ProjectVaultRepository } from "./project-vault.repository";
import type {
  CloneVaultBody,
  CreateVaultBody,
  UpdateVaultBody,
  VaultResponse,
} from "./project-vault.schema";

@singleton()
export class ProjectVaultService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly vaultRepo: ProjectVaultRepository,
  ) {}

  async list(projectId: string): Promise<VaultResponse[]> {
    const vaults = await this.prisma.vault.findMany({
      where: { projectId },
      include: {
        variables: { select: { isRequired: true, encryptedValue: true } },
        _count: { select: { variables: true, secretFiles: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return vaults.map((v) => {
      const required = v.variables.filter((x) => x.isRequired);
      const filled = required.filter((x) => x.encryptedValue !== "");
      return {
        id: v.id,
        projectId: v.projectId,
        name: v.name,
        directoryPath: v.directoryPath,
        tags: v.tags,
        variableCount: v._count.variables,
        secretFileCount: v._count.secretFiles,
        requiredTotal: required.length,
        requiredFilled: filled.length,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
    });
  }

  async create(projectId: string, body: CreateVaultBody): Promise<VaultResponse> {
    const existing = await this.prisma.vault.findUnique({
      where: { projectId_name: { projectId, name: body.name } },
    });

    if (existing) {
      throw new ConflictError(`Vault "${body.name}" already exists`);
    }

    const vault = await this.prisma.vault.create({
      data: {
        projectId,
        name: body.name,
        directoryPath: body.directoryPath,
        tags: dedupeTags(body.tags ?? []),
      },
    });

    return this.toResponse(vault, { variableCount: 0, secretFileCount: 0 }, [], []);
  }

  async update(projectId: string, vaultId: string, body: UpdateVaultBody): Promise<VaultResponse> {
    const current = await this.vaultRepo.requireVault(projectId, vaultId);

    if (body.name && body.name !== current.name) {
      const duplicate = await this.prisma.vault.findUnique({
        where: { projectId_name: { projectId, name: body.name } },
      });
      if (duplicate) {
        throw new ConflictError(`Vault "${body.name}" already exists`);
      }
    }

    const updated = await this.prisma.vault.update({
      where: { id: vaultId },
      data: {
        name: body.name,
        directoryPath: body.directoryPath,
        tags: body.tags ? dedupeTags(body.tags) : undefined,
      },
      include: {
        variables: { select: { isRequired: true, encryptedValue: true } },
        _count: { select: { variables: true, secretFiles: true } },
      },
    });

    return this.toResponse(
      updated,
      { variableCount: updated._count.variables, secretFileCount: updated._count.secretFiles },
      updated.variables.filter((v) => v.isRequired),
      updated.variables.filter((v) => v.isRequired && v.encryptedValue !== ""),
    );
  }

  async delete(projectId: string, vaultId: string): Promise<{ message: string }> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    await this.prisma.vault.delete({ where: { id: vaultId } });

    return { message: `Vault "${vault.name}" deleted` };
  }

  /**
   * Clone a vault's keyset into a new vault with blank values.
   * Keys, descriptions, required flags, sort order, directoryPath and tags carry over.
   * encryptedValue/iv/authTag are set to empty strings so the new vault shows 0 of N required filled.
   */
  async clone(
    projectId: string,
    sourceVaultId: string,
    body: CloneVaultBody,
    userId: string,
    ipAddress: string,
  ): Promise<VaultResponse> {
    const source = await this.vaultRepo.requireVault(projectId, sourceVaultId);

    const duplicate = await this.prisma.vault.findUnique({
      where: { projectId_name: { projectId, name: body.targetName } },
    });
    if (duplicate) {
      throw new ConflictError(`Vault "${body.targetName}" already exists`);
    }

    const sourceVars = await this.prisma.envVariable.findMany({
      where: { vaultId: sourceVaultId },
      select: {
        key: true,
        description: true,
        isRequired: true,
        sortOrder: true,
      },
    });

    const target = await this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.create({
        data: {
          projectId,
          name: body.targetName,
          directoryPath: source.directoryPath,
          tags: source.tags,
        },
      });

      if (sourceVars.length > 0) {
        await tx.envVariable.createMany({
          data: sourceVars.map((v) => ({
            vaultId: vault.id,
            key: v.key,
            encryptedValue: "",
            iv: "",
            authTag: "",
            description: v.description,
            isRequired: v.isRequired,
            sortOrder: v.sortOrder,
          })),
        });
      }

      return vault;
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "CLONE",
      resourceType: "ENV_VARIABLE",
      resourceId: target.id,
      ipAddress,
      metadata: {
        sourceVaultName: source.name,
        targetVaultName: body.targetName,
        variableCount: sourceVars.length,
      },
    });

    return this.toResponse(
      target,
      { variableCount: sourceVars.length, secretFileCount: 0 },
      sourceVars.filter((v) => v.isRequired),
      [],
    );
  }

  /** Distinct tag values across all vaults in the project, ordered alphabetically. */
  async listTags(projectId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ tag: string }>>`
      SELECT DISTINCT UNNEST(tags) AS tag
      FROM vaults
      WHERE project_id = ${projectId}::uuid
      ORDER BY tag ASC
    `;
    return rows.map((r) => r.tag);
  }

  private toResponse(
    vault: {
      id: string;
      projectId: string;
      name: string;
      directoryPath: string | null;
      tags: string[];
      createdAt: Date;
      updatedAt: Date;
    },
    counts: { variableCount: number; secretFileCount: number },
    required: unknown[],
    filled: unknown[],
  ): VaultResponse {
    return {
      id: vault.id,
      projectId: vault.projectId,
      name: vault.name,
      directoryPath: vault.directoryPath,
      tags: vault.tags,
      variableCount: counts.variableCount,
      secretFileCount: counts.secretFileCount,
      requiredTotal: required.length,
      requiredFilled: filled.length,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    };
  }
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}
