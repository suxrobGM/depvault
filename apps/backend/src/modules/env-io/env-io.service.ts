import { singleton } from "tsyringe";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import {
  ProjectVaultRepository,
  toEncryptedResponse,
  toExampleLine,
  type EnvVariableWithValueResponse,
} from "@/modules/project-vault";
import type {
  EnvExampleResponse,
  ExportEnvVariablesResponse,
  ImportEnvVariablesBody,
  ImportEnvVariablesResponse,
} from "./env-io.schema";

@singleton()
export class EnvironmentIOService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly vaultRepo: ProjectVaultRepository,
  ) {}

  async bulkImport(
    projectId: string,
    vaultId: string,
    body: ImportEnvVariablesBody,
    userId: string,
    ipAddress: string,
  ): Promise<ImportEnvVariablesResponse> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    const variables: EnvVariableWithValueResponse[] = [];
    let updated = 0;

    for (const entry of body.entries) {
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

      const variable = await this.prisma.envVariable.upsert({
        where: { vaultId_key: { vaultId: vault.id, key: entry.key } },
        create: { vaultId: vault.id, key: entry.key, ...data },
        update: data,
      });

      if (variable.updatedAt > variable.createdAt) {
        updated++;
      }

      variables.push(toEncryptedResponse(variable));
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: {
        imported: variables.length,
        updated,
        vaultName: vault.name,
      },
    });

    return { imported: variables.length, updated, variables };
  }

  async export(
    projectId: string,
    vaultId: string,
    userId: string,
    ipAddress: string,
  ): Promise<ExportEnvVariablesResponse> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    const variables = await this.prisma.envVariable.findMany({
      where: { vaultId: vault.id },
      orderBy: [{ sortOrder: { sort: "asc", nulls: "last" } }, { key: "asc" }],
    });

    const entries = variables.map((v) => ({
      key: v.key,
      encryptedValue: v.encryptedValue,
      iv: v.iv,
      authTag: v.authTag,
      sortOrder: v.sortOrder,
      encryptedComment: v.encryptedComment,
      commentIv: v.commentIv,
      commentAuthTag: v.commentAuthTag,
    }));

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { vaultName: vault.name, count: variables.length },
    });

    return { vaultId: vault.id, vaultName: vault.name, entries };
  }

  async generateExample(projectId: string, vaultId: string): Promise<EnvExampleResponse> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    const variables = await this.prisma.envVariable.findMany({
      where: { vaultId: vault.id },
      orderBy: { key: "asc" },
    });

    const content = variables.map(toExampleLine).join("\n");
    return { vaultId: vault.id, vaultName: vault.name, content };
  }
}
