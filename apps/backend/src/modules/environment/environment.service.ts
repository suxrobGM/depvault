import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification";
import type { PaginatedResponse } from "@/types/response";
import type {
  CreateEnvVariableBody,
  EnvVariableWithValueResponse,
  UpdateEnvVariableBody,
} from "./env-variable.schema";
import { toDecryptedResponse, toMaskedResponse, toResponseWithValue } from "./environment.mapper";
import { EnvironmentRepository } from "./environment.repository";
import type { EnvironmentResponse } from "./environment.schema";

@singleton()
export class EnvironmentService {
  private static readonly NOTIFICATION_COOLDOWN_HOURS = 24;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async listEnvironments(
    projectId: string,
    userId: string,
    vaultGroupId?: string,
  ): Promise<EnvironmentResponse[]> {
    await this.envHelper.requireMember(projectId, userId);

    const where = vaultGroupId ? { projectId, vaultGroupId } : { projectId };

    const environments = await this.prisma.environment.findMany({
      where,
      include: { vaultGroup: true, _count: { select: { variables: true } } },
      orderBy: { createdAt: "asc" },
    });

    return environments.map((env) => ({
      id: env.id,
      type: env.type,
      vaultGroupId: env.vaultGroupId,
      vaultGroupName: env.vaultGroup.name,
      variableCount: env._count.variables,
      createdAt: env.createdAt,
    }));
  }

  async create(
    projectId: string,
    body: CreateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const environment = await this.envHelper.findOrCreateEnvironment(
      projectId,
      body.vaultGroupId,
      body.environmentType as EnvironmentType,
    );

    const projectKey = deriveProjectKey(projectId);
    const { ciphertext, iv, authTag } = encrypt(body.value, projectKey);

    const variable = await this.prisma.envVariable.create({
      data: {
        environmentId: environment.id,
        key: body.key,
        encryptedValue: ciphertext,
        iv,
        authTag,
        description: body.description,
        isRequired: body.isRequired ?? false,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: variable.id,
      ipAddress,
      metadata: { key: body.key },
    });

    return toResponseWithValue(variable, body.value);
  }

  async list(
    projectId: string,
    userId: string,
    vaultGroupId: string,
    environmentType?: string,
    page = 1,
    limit = 20,
    ipAddress = "unknown",
  ): Promise<PaginatedResponse<EnvVariableWithValueResponse>> {
    const member = await this.envHelper.requireMember(projectId, userId);
    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";

    const where = environmentType
      ? { environment: { projectId, vaultGroupId, type: environmentType as EnvironmentType } }
      : { environment: { projectId, vaultGroupId } };

    const [variables, total] = await Promise.all([
      this.prisma.envVariable.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.envVariable.count({ where }),
    ]);

    const projectKey = canReadValues ? deriveProjectKey(projectId) : null;
    const items = variables.map((v) =>
      projectKey ? toDecryptedResponse(v, projectKey) : toMaskedResponse(v),
    );

    if (canReadValues && variables.length > 0) {
      await this.auditLogService.log({
        userId,
        projectId,
        action: "READ",
        resourceType: "ENV_VARIABLE",
        resourceId: projectId,
        ipAddress,
        metadata: { count: variables.length, environmentType: environmentType ?? null },
      });

      void this.checkDrift(projectId, userId);
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
    varId: string,
    body: UpdateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, environment: { projectId } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    const projectKey = deriveProjectKey(projectId);

    let encryptionFields = {};
    if (body.value !== undefined) {
      const { ciphertext, iv, authTag } = encrypt(body.value, projectKey);
      encryptionFields = { encryptedValue: ciphertext, iv, authTag };

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

    const updated = await this.prisma.envVariable.update({
      where: { id: varId },
      data: {
        ...(body.key !== undefined && { key: body.key }),
        ...encryptionFields,
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "ENV_VARIABLE",
      resourceId: varId,
      ipAddress,
      metadata: { key: updated.key },
    });

    return toDecryptedResponse(updated, projectKey);
  }

  async delete(
    projectId: string,
    varId: string,
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, environment: { projectId } },
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
      metadata: { key: variable.key },
    });

    return { message: "Environment variable deleted successfully" };
  }

  /** Delete an entire environment and all its variables. */
  async deleteEnvironment(
    projectId: string,
    envId: string,
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const environment = await this.prisma.environment.findFirst({
      where: { id: envId, projectId },
      include: { _count: { select: { variables: true } } },
    });

    if (!environment) {
      throw new NotFoundError("Environment not found");
    }

    await this.prisma.environment.delete({ where: { id: envId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "ENV_VARIABLE",
      resourceId: envId,
      ipAddress,
      metadata: { type: environment.type, variableCount: environment._count.variables },
    });

    return { message: "Environment deleted successfully" };
  }

  private async checkDrift(projectId: string, userId: string): Promise<void> {
    try {
      const environments = await this.prisma.environment.findMany({
        where: { projectId },
        include: { variables: { select: { key: true } } },
      });

      if (environments.length < 2) return;

      const allKeys = new Set(environments.flatMap((env) => env.variables.map((v) => v.key)));
      const missingVars: { env: string; variable: string }[] = [];

      for (const env of environments) {
        const envKeys = new Set(env.variables.map((v) => v.key));
        for (const key of allKeys) {
          if (!envKeys.has(key)) {
            missingVars.push({ env: env.type, variable: key });
          }
        }
      }

      if (missingVars.length === 0) return;

      const recent = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: "ENV_DRIFT",
          metadata: { path: ["projectId"], equals: projectId },
          createdAt: {
            gte: new Date(Date.now() - EnvironmentService.NOTIFICATION_COOLDOWN_HOURS * 3600_000),
          },
        },
      });

      if (recent) return;

      void this.notificationService.notify({
        type: "ENV_DRIFT",
        userId,
        projectId,
        missingVars,
      });
    } catch (error) {
      logger.error({ error }, "Failed to check environment drift");
    }
  }
}
