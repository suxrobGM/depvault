import { singleton } from "tsyringe";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type {
  EnvExampleResponse,
  EnvVariableWithValueResponse,
  ExportEnvVariablesResponse,
  ImportEnvVariablesBody,
  ImportEnvVariablesResponse,
} from "./env-variable.schema";
import { toEncryptedResponse, toExampleLine } from "./environment.mapper";
import { EnvironmentRepository } from "./environment.repository";

@singleton()
export class EnvironmentIOService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envRepository: EnvironmentRepository,
  ) {}

  async bulkImport(
    projectId: string,
    body: ImportEnvVariablesBody,
    userId: string,
    ipAddress: string,
  ): Promise<ImportEnvVariablesResponse> {
    const groupName = await this.envRepository.getVaultGroupName(body.vaultGroupId);

    const environment = await this.envRepository.findOrCreateEnvironment(
      projectId,
      body.vaultGroupId,
      body.environmentType as EnvironmentType,
    );

    const variables: EnvVariableWithValueResponse[] = [];
    let updated = 0;

    for (const entry of body.entries) {
      const data = {
        encryptedValue: entry.encryptedValue,
        iv: entry.iv,
        authTag: entry.authTag,
        description: entry.description ?? null,
        isRequired: entry.isRequired ?? false,
      };

      const variable = await this.prisma.envVariable.upsert({
        where: { environmentId_key: { environmentId: environment.id, key: entry.key } },
        create: { environmentId: environment.id, key: entry.key, ...data },
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
        vaultGroupName: groupName,
      },
    });

    return { imported: variables.length, updated, variables };
  }

  async export(
    projectId: string,
    vaultGroupId: string,
    environmentType: EnvironmentType,
    userId: string,
    ipAddress: string,
  ): Promise<ExportEnvVariablesResponse> {
    const groupName = await this.envRepository.getVaultGroupName(vaultGroupId);
    const env = await this.envRepository.requireEnvironment(vaultGroupId, environmentType);

    const variables = await this.prisma.envVariable.findMany({
      where: { environmentId: env.id },
      orderBy: { key: "asc" },
    });

    const entries = variables.map((v) => ({
      key: v.key,
      encryptedValue: v.encryptedValue,
      iv: v.iv,
      authTag: v.authTag,
    }));

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { environmentType, count: variables.length, vaultGroupName: groupName },
    });

    return { entries, environmentType };
  }

  async generateExample(
    vaultGroupId: string,
    environmentType: EnvironmentType,
  ): Promise<EnvExampleResponse> {
    const env = await this.envRepository.requireEnvironment(vaultGroupId, environmentType);

    const variables = await this.prisma.envVariable.findMany({
      where: { environmentId: env.id },
      orderBy: { key: "asc" },
    });

    const content = variables.map(toExampleLine).join("\n");
    return { content, environmentType };
  }
}
