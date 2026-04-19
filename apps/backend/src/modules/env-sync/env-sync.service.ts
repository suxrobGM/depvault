import { singleton } from "tsyringe";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { EnvironmentRepository } from "@/modules/environment";
import type { SyncEnvironmentBody, SyncEnvironmentResponse } from "./env-sync.schema";

@singleton()
export class EnvironmentSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** Sync pre-encrypted entries from the client into a target environment (bulk upsert). */
  async syncEnvironment(
    projectId: string,
    body: SyncEnvironmentBody,
    userId: string,
    ipAddress: string,
  ): Promise<SyncEnvironmentResponse> {
    const groupName = await this.envHelper.getVaultGroupName(body.vaultGroupId);

    const targetEnv = await this.envHelper.findOrCreateEnvironment(
      projectId,
      body.vaultGroupId,
      body.targetEnvironmentType as EnvironmentType,
    );

    const synced = await Promise.all(
      body.entries.map((entry) => {
        const data = {
          encryptedValue: entry.encryptedValue,
          iv: entry.iv,
          authTag: entry.authTag,
          description: entry.description ?? null,
          isRequired: entry.isRequired ?? false,
          sortOrder: entry.sortOrder ?? null,
          encryptedComment: entry.encryptedComment ?? null,
          commentIv: entry.commentIv ?? null,
          commentAuthTag: entry.commentAuthTag ?? null,
        };

        return this.prisma.envVariable.upsert({
          where: {
            environmentId_key: {
              environmentId: targetEnv.id,
              key: entry.key,
            },
          },
          create: {
            environmentId: targetEnv.id,
            key: entry.key,
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
        source: body.sourceEnvironmentType,
        target: body.targetEnvironmentType,
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
