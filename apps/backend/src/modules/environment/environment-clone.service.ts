import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { EnvironmentRepository } from "./environment.repository";
import type { CloneEnvironmentBody } from "./environment.schema";

@singleton()
export class EnvironmentCloneService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** Clone an environment's variable structure (keys + metadata) into a new environment with empty values. */
  async cloneEnvironment(
    projectId: string,
    body: CloneEnvironmentBody,
    userId: string,
    ipAddress: string,
  ) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const sourceEnv = await this.prisma.environment.findUnique({
      where: { projectId_name: { projectId, name: body.sourceEnvironment } },
      include: { variables: true },
    });

    if (!sourceEnv) {
      throw new NotFoundError(`Source environment "${body.sourceEnvironment}" not found`);
    }

    const targetEnv = await this.envHelper.findOrCreateEnvironment(
      projectId,
      body.targetName,
      body.targetType,
    );

    const projectKey = deriveProjectKey(projectId);

    const created = await Promise.all(
      sourceEnv.variables.map((v) => {
        const { ciphertext, iv, authTag } = encrypt("", projectKey);
        return this.prisma.envVariable.create({
          data: {
            environmentId: targetEnv.id,
            key: v.key,
            encryptedValue: ciphertext,
            iv,
            authTag,
            description: v.description,
            isRequired: v.isRequired,
            validationRule: v.validationRule,
          },
        });
      }),
    );

    await this.auditLogService.log({
      userId,
      projectId,
      action: "CLONE",
      resourceType: "ENV_VARIABLE",
      resourceId: targetEnv.id,
      ipAddress,
      metadata: {
        source: body.sourceEnvironment,
        target: body.targetName,
        variableCount: created.length,
      },
    });

    return {
      id: targetEnv.id,
      name: targetEnv.name,
      type: targetEnv.type,
      variableCount: created.length,
    };
  }
}
