import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
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

  /** Clone an environment's variables (keys, values, and metadata) into a new environment. */
  async cloneEnvironment(
    projectId: string,
    body: CloneEnvironmentBody,
    userId: string,
    ipAddress: string,
  ) {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

    const groupName = await this.envHelper.getVaultGroupName(body.vaultGroupId);

    const sourceEnv = await this.prisma.environment.findUnique({
      where: {
        vaultGroupId_type: {
          vaultGroupId: body.vaultGroupId,
          type: body.sourceType as EnvironmentType,
        },
      },
      include: { variables: true },
    });

    if (!sourceEnv) {
      throw new NotFoundError(`Source environment "${body.sourceType}" not found`);
    }

    const targetEnv = await this.envHelper.findOrCreateEnvironment(
      projectId,
      body.vaultGroupId,
      body.targetType as EnvironmentType,
    );

    const projectKey = deriveProjectKey(projectId);

    const created = await Promise.all(
      sourceEnv.variables.map((v) => {
        const plaintext = decrypt(v.encryptedValue, v.iv, v.authTag, projectKey);
        const { ciphertext, iv, authTag } = encrypt(plaintext, projectKey);

        return this.prisma.envVariable.create({
          data: {
            environmentId: targetEnv.id,
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
      action: "CLONE",
      resourceType: "ENV_VARIABLE",
      resourceId: targetEnv.id,
      ipAddress,
      metadata: {
        source: body.sourceType,
        target: body.targetType,
        variableCount: created.length,
        vaultGroupName: groupName,
      },
    });

    return {
      id: targetEnv.id,
      type: targetEnv.type,
      variableCount: created.length,
    };
  }
}
