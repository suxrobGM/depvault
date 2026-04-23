import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import { toEncryptedResponse } from "./env-variable.mapper";
import type {
  CreateEnvVariableBody,
  EnvVariableWithValueResponse,
  UpdateEnvVariableBody,
} from "./env-variable.schema";
import { ProjectVaultRepository } from "./project-vault.repository";

@singleton()
export class EnvVariableService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly vaultRepo: ProjectVaultRepository,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async create(
    projectId: string,
    vaultId: string,
    body: CreateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.planEnforcement.enforceForProject(projectId, "envVar");

    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    const variable = await this.prisma.envVariable.create({
      data: {
        vaultId: vault.id,
        key: body.key,
        encryptedValue: body.encryptedValue,
        iv: body.iv,
        authTag: body.authTag,
        description: body.description,
        isRequired: body.isRequired ?? false,
        sortOrder: body.sortOrder ?? null,
        encryptedComment: body.encryptedComment ?? null,
        commentIv: body.commentIv ?? null,
        commentAuthTag: body.commentAuthTag ?? null,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: variable.id,
      ipAddress,
      metadata: { key: body.key, vaultName: vault.name },
    });

    return toEncryptedResponse(variable);
  }

  async list(
    projectId: string,
    vaultId: string,
    userId: string,
    page = 1,
    limit = 20,
    ipAddress = "unknown",
  ): Promise<PaginatedResponse<EnvVariableWithValueResponse>> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    const where = { vaultId: vault.id };

    const [variables, total] = await Promise.all([
      this.prisma.envVariable.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.envVariable.count({ where }),
    ]);

    const items = variables.map(toEncryptedResponse);

    if (variables.length > 0) {
      await this.auditLogService.log({
        userId,
        projectId,
        action: "READ",
        resourceType: "ENV_VARIABLE",
        resourceId: projectId,
        ipAddress,
        metadata: { count: variables.length, vaultName: vault.name },
      });
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(
    projectId: string,
    vaultId: string,
    varId: string,
    body: UpdateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, vaultId, vault: { projectId } },
      include: { vault: { select: { name: true } } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    let encryptionFields = {};
    if (body.encryptedValue !== undefined && body.iv !== undefined && body.authTag !== undefined) {
      encryptionFields = {
        encryptedValue: body.encryptedValue,
        iv: body.iv,
        authTag: body.authTag,
      };

      // Only snapshot when the previous value was non-blank (don't version the "blank" state).
      if (variable.encryptedValue !== "") {
        await this.prisma.envVariableVersion.create({
          data: {
            variableId: variable.id,
            encryptedValue: variable.encryptedValue,
            iv: variable.iv,
            authTag: variable.authTag,
            changedBy: userId,
          },
        });
      }
    }

    const updated = await this.prisma.envVariable.update({
      where: { id: varId },
      data: {
        ...(body.key !== undefined && { key: body.key }),
        ...encryptionFields,
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.encryptedComment !== undefined && { encryptedComment: body.encryptedComment }),
        ...(body.commentIv !== undefined && { commentIv: body.commentIv }),
        ...(body.commentAuthTag !== undefined && { commentAuthTag: body.commentAuthTag }),
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "ENV_VARIABLE",
      resourceId: varId,
      ipAddress,
      metadata: { key: updated.key, vaultName: variable.vault.name },
    });

    return toEncryptedResponse(updated);
  }

  async delete(
    projectId: string,
    vaultId: string,
    varId: string,
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, vaultId, vault: { projectId } },
      include: { vault: { select: { name: true } } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    await this.prisma.envVariable.delete({ where: { id: varId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "ENV_VARIABLE",
      resourceId: varId,
      ipAddress,
      metadata: { key: variable.key, vaultName: variable.vault.name },
    });

    return { message: "Environment variable deleted successfully" };
  }

  async batchDelete(
    projectId: string,
    vaultId: string,
    variableIds: string[],
    userId: string,
    ipAddress: string,
  ): Promise<{ deleted: number }> {
    const variables = await this.prisma.envVariable.findMany({
      where: { id: { in: variableIds }, vaultId, vault: { projectId } },
      include: { vault: { select: { name: true } } },
    });

    if (variables.length === 0) {
      throw new NotFoundError("No matching variables found");
    }

    await this.prisma.envVariable.deleteMany({
      where: { id: { in: variables.map((v) => v.id) } },
    });

    await Promise.all(
      variables.map((variable) =>
        this.auditLogService.log({
          userId,
          projectId,
          action: "DELETE",
          resourceType: "ENV_VARIABLE",
          resourceId: variable.id,
          ipAddress,
          metadata: { key: variable.key, vaultName: variable.vault.name },
        }),
      ),
    );

    return { deleted: variables.length };
  }
}
