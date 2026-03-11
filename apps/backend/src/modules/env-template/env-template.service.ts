import { singleton } from "tsyringe";
import { ConflictError, NotFoundError } from "@/common/errors";
import { deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { EnvironmentRepository } from "@/modules/environment/environment.repository";
import type {
  ApplyTemplateBody,
  CreateEnvTemplateBody,
  UpdateEnvTemplateBody,
} from "./env-template.schema";

@singleton()
export class EnvTemplateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** Create a template — either from an existing environment or from a manual variable list. */
  async create(projectId: string, body: CreateEnvTemplateBody, userId: string, ipAddress: string) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    let variables: {
      key: string;
      description?: string;
      isRequired?: boolean;
    }[] = [];

    if (body.sourceEnvironmentType) {
      const env = await this.prisma.environment.findFirst({
        where: {
          type: body.sourceEnvironmentType as EnvironmentType,
          ...(body.sourceVaultGroupId ? { vaultGroupId: body.sourceVaultGroupId } : { projectId }),
        },
        include: { variables: { orderBy: { createdAt: "asc" } } },
      });
      if (!env) throw new NotFoundError(`Environment "${body.sourceEnvironmentType}" not found`);
      variables = env.variables.map((v) => ({
        key: v.key,
        description: v.description ?? undefined,
        isRequired: v.isRequired,
      }));
    } else if (body.variables) {
      variables = body.variables;
    }

    const existing = await this.prisma.envTemplate.findUnique({
      where: { projectId_name: { projectId, name: body.name } },
    });
    if (existing) throw new ConflictError(`Template "${body.name}" already exists`);

    const template = await this.prisma.envTemplate.create({
      data: {
        projectId,
        name: body.name,
        description: body.description,
        createdBy: userId,
        variables: {
          create: variables.map((v, i) => ({
            key: v.key,
            description: v.description,
            isRequired: v.isRequired ?? false,
            sortOrder: i,
          })),
        },
      },
      include: { variables: { orderBy: { sortOrder: "asc" } } },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_TEMPLATE",
      resourceId: template.id,
      ipAddress,
      metadata: { name: body.name, variableCount: template.variables.length },
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      variableCount: template.variables.length,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async list(projectId: string, userId: string) {
    await this.envHelper.requireMember(projectId, userId);

    const templates = await this.prisma.envTemplate.findMany({
      where: { projectId },
      include: { _count: { select: { variables: true } } },
      orderBy: { createdAt: "desc" },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      variableCount: t._count.variables,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async getDetail(projectId: string, templateId: string, userId: string) {
    await this.envHelper.requireMember(projectId, userId);

    const template = await this.prisma.envTemplate.findFirst({
      where: { id: templateId, projectId },
      include: { variables: { orderBy: { sortOrder: "asc" } } },
    });

    if (!template) throw new NotFoundError("Template not found");

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      variables: template.variables.map((v) => ({
        id: v.id,
        key: v.key,
        description: v.description,
        isRequired: v.isRequired,
        sortOrder: v.sortOrder,
      })),
    };
  }

  async update(
    projectId: string,
    templateId: string,
    body: UpdateEnvTemplateBody,
    userId: string,
    ipAddress: string,
  ) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const template = await this.prisma.envTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundError("Template not found");

    const updated = await this.prisma.envTemplate.update({
      where: { id: templateId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
      include: { _count: { select: { variables: true } } },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "ENV_TEMPLATE",
      resourceId: templateId,
      ipAddress,
      metadata: { name: updated.name },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      variableCount: updated._count.variables,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(projectId: string, templateId: string, userId: string, ipAddress: string) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const template = await this.prisma.envTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundError("Template not found");

    await this.prisma.envTemplate.delete({ where: { id: templateId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "ENV_TEMPLATE",
      resourceId: templateId,
      ipAddress,
      metadata: { name: template.name },
    });

    return { message: "Template deleted successfully" };
  }

  /** Apply a template to create a new environment with empty-valued variables. */
  async apply(
    projectId: string,
    templateId: string,
    body: ApplyTemplateBody,
    userId: string,
    ipAddress: string,
  ) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const template = await this.prisma.envTemplate.findFirst({
      where: { id: templateId, projectId },
      include: { variables: { orderBy: { sortOrder: "asc" } } },
    });
    if (!template) throw new NotFoundError("Template not found");

    const env = await this.envHelper.findOrCreateEnvironment(
      projectId,
      body.vaultGroupId,
      body.environmentType as EnvironmentType,
    );

    const projectKey = deriveProjectKey(projectId);

    const created = await Promise.all(
      template.variables.map((v) => {
        const { ciphertext, iv, authTag } = encrypt("", projectKey);
        return this.prisma.envVariable.create({
          data: {
            environmentId: env.id,
            key: v.key,
            encryptedValue: ciphertext,
            iv,
            authTag,
            description: v.description,
            isRequired: v.isRequired,
          },
        });
      }),
    );

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: env.id,
      ipAddress,
      metadata: {
        type: "template_apply",
        templateName: template.name,
        environmentType: body.environmentType,
        variableCount: created.length,
      },
    });

    return {
      environmentId: env.id,
      environmentType: env.type,
      variablesCreated: created.length,
    };
  }
}
