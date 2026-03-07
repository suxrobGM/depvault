import { singleton } from "tsyringe";
import { PARSERS, SERIALIZERS, type ConfigFormat } from "@/common/parsers";
import { decrypt, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { toExampleLine, toResponseWithValue } from "./env-variable.mapper";
import type { EnvVariableWithValueResponse, ImportEnvVariablesBody } from "./env-variable.schema";
import { EnvironmentRepository } from "./environment.repository";

@singleton()
export class EnvVariableIOService {
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
  ) {
    await this.envRepository.requireEditorOrOwner(projectId, userId);

    const parser = PARSERS[body.format as ConfigFormat];
    const entries = parser.parse(body.content);

    const environment = await this.envRepository.findOrCreateEnvironment(
      projectId,
      body.environment,
      body.environmentType,
    );

    const projectKey = deriveProjectKey(projectId);
    const variables: EnvVariableWithValueResponse[] = [];
    let skipped = 0;

    for (const entry of entries) {
      const existing = await this.prisma.envVariable.findUnique({
        where: { environmentId_key: { environmentId: environment.id, key: entry.key } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const { ciphertext, iv, authTag } = encrypt(entry.value, projectKey);

      const variable = await this.prisma.envVariable.create({
        data: {
          environmentId: environment.id,
          key: entry.key,
          encryptedValue: ciphertext,
          iv,
          authTag,
        },
      });

      variables.push(toResponseWithValue(variable, entry.value));
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { imported: variables.length, skipped, format: body.format },
    });

    return { imported: variables.length, skipped, variables };
  }

  async export(
    projectId: string,
    environment: string,
    format: ConfigFormat,
    userId: string,
    ipAddress: string,
  ) {
    await this.envRepository.requireEditorOrOwner(projectId, userId);

    const env = await this.envRepository.requireEnvironment(projectId, environment);

    const variables = await this.prisma.envVariable.findMany({
      where: { environmentId: env.id },
      orderBy: { key: "asc" },
    });

    const projectKey = deriveProjectKey(projectId);
    const entries = variables.map((v) => ({
      key: v.key,
      value: decrypt(v.encryptedValue, v.iv, v.authTag, projectKey),
    }));

    const serializer = SERIALIZERS[format];
    const content = serializer.serialize(entries);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { format, environment, count: variables.length },
    });

    return { content, format, environment };
  }

  async generateExample(projectId: string, environment: string, userId: string) {
    await this.envRepository.requireMember(projectId, userId);

    const env = await this.envRepository.requireEnvironment(projectId, environment);

    const variables = await this.prisma.envVariable.findMany({
      where: { environmentId: env.id },
      orderBy: { key: "asc" },
    });

    const content = variables.map(toExampleLine).join("\n");
    return { content, environment };
  }
}
