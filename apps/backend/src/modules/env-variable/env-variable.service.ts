import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type { PaginatedResponse } from "@/types/response";
import { toDecryptedResponse, toMaskedResponse, toResponseWithValue } from "./env-variable.mapper";
import type {
  CreateEnvVariableBody,
  EnvVariableWithValueResponse,
  UpdateEnvVariableBody,
} from "./env-variable.schema";
import { EnvironmentRepository } from "./environment.repository";

@singleton()
export class EnvVariableService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  async create(
    projectId: string,
    body: CreateEnvVariableBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const environment = await this.envHelper.findOrCreateEnvironment(
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

    return toResponseWithValue(variable, body.value);
  }

  async list(
    projectId: string,
    userId: string,
    environmentName?: string,
    page = 1,
    limit = 20,
    ipAddress = "unknown",
  ): Promise<PaginatedResponse<EnvVariableWithValueResponse>> {
    const member = await this.envHelper.requireMember(projectId, userId);
    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";

    const where = environmentName
      ? { environment: { projectId, name: environmentName } }
      : { environment: { projectId } };

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
}
