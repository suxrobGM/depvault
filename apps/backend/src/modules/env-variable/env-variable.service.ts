import { injectable, singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import type { PaginatedResponse } from "@/types/response";
import type {
  CreateEnvVariableBody,
  EnvVariableWithValueResponse,
  UpdateEnvVariableBody,
} from "./env-variable.schema";

@singleton()
export class EnvVariableService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    projectId: string,
    body: CreateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.requireEditorOrOwner(projectId, userId);

    const environment = await this.findOrCreateEnvironment(
      projectId,
      body.environment,
      body.environmentType,
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
        validationRule: body.validationRule,
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

    return this.toResponseWithValue(variable, body.value);
  }

  async list(
    projectId: string,
    userId: string,
    environmentName?: string,
    page = 1,
    limit = 20,
    ipAddress = "unknown",
  ): Promise<PaginatedResponse<EnvVariableWithValueResponse>> {
    const member = await this.requireMember(projectId, userId);
    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";

    const environmentFilter = environmentName
      ? { environment: { projectId, name: environmentName } }
      : { environment: { projectId } };

    const where = { ...environmentFilter };

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

    const items = variables.map((v) => ({
      id: v.id,
      environmentId: v.environmentId,
      key: v.key,
      value: projectKey ? decrypt(v.encryptedValue, v.iv, v.authTag, projectKey) : "********",
      description: v.description,
      isRequired: v.isRequired,
      validationRule: v.validationRule,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    if (canReadValues && variables.length > 0) {
      await this.auditLogService.log({
        userId,
        projectId,
        action: "READ",
        resourceType: "ENV_VARIABLE",
        resourceId: projectId,
        ipAddress,
        metadata: { count: variables.length, environment: environmentName ?? null },
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
    varId: string,
    body: UpdateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.requireEditorOrOwner(projectId, userId);

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
        ...(body.validationRule !== undefined && { validationRule: body.validationRule }),
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

    const decryptedValue = decrypt(updated.encryptedValue, updated.iv, updated.authTag, projectKey);
    return this.toResponseWithValue(updated, decryptedValue);
  }

  async delete(
    projectId: string,
    varId: string,
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    await this.requireEditorOrOwner(projectId, userId);

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

  private async findOrCreateEnvironment(projectId: string, name: string, type?: string) {
    const existing = await this.prisma.environment.findUnique({
      where: { projectId_name: { projectId, name } },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: {
        projectId,
        name,
        type: (type as "DEVELOPMENT" | "STAGING" | "PRODUCTION" | "CUSTOM") ?? "DEVELOPMENT",
      },
    });
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    return member;
  }

  private async requireEditorOrOwner(projectId: string, userId: string) {
    const member = await this.requireMember(projectId, userId);

    if (member.role !== "OWNER" && member.role !== "EDITOR") {
      throw new ForbiddenError("Only owners and editors can modify environment variables");
    }

    return member;
  }

  private toResponseWithValue(
    variable: {
      id: string;
      environmentId: string;
      key: string;
      description: string | null;
      isRequired: boolean;
      validationRule: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    value: string,
  ): EnvVariableWithValueResponse {
    return {
      id: variable.id,
      environmentId: variable.environmentId,
      key: variable.key,
      value,
      description: variable.description,
      isRequired: variable.isRequired,
      validationRule: variable.validationRule,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
    };
  }
}
