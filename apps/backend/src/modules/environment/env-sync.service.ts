import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { EnvironmentRepository } from "./environment.repository";
import type { SyncEnvironmentBody } from "./environment.schema";

@singleton()
export class EnvironmentSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** Sync an environment's variables into another environment (upserts matching keys). */
  async syncEnvironment(
    projectId: string,
    body: SyncEnvironmentBody,
    userId: string,
    ipAddress: string,
  ) {
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

    const synced = await Promise.all(
      sourceEnv.variables.map((v) => {
        const plaintext = decrypt(v.encryptedValue, v.iv, v.authTag, projectKey);
        const { ciphertext, iv, authTag } = encrypt(plaintext, projectKey);

        const data = {
          encryptedValue: ciphertext,
          iv,
          authTag,
          description: v.description,
          isRequired: v.isRequired,
        };

        return this.prisma.envVariable.upsert({
          where: {
            environmentId_key: {
              environmentId: targetEnv.id,
              key: v.key,
            },
          },
          create: {
            environmentId: targetEnv.id,
            key: v.key,
            ...data,
          },
          update: data,
        });
      }),
    );

    await this.auditLogService.log({
      userId,
      projectId,
      action: "SYNC",
      resourceType: "ENV_VARIABLE",
      resourceId: targetEnv.id,
      ipAddress,
      metadata: {
        source: body.sourceType,
        target: body.targetType,
        variableCount: synced.length,
        vaultGroupName: groupName,
      },
    });

    return {
      id: targetEnv.id,
      type: targetEnv.type,
      variableCount: synced.length,
    };
  }
}
