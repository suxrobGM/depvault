import { zipSync } from "fflate";
import { singleton } from "tsyringe";
import { BadRequestError } from "@/common/errors";
import { getConfigFileName, SERIALIZERS } from "@/common/parsers";
import { decrypt, decryptBinary, deriveProjectKey } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type { EnvBundleBody } from "./env-bundle.schema";
import { EnvironmentRepository } from "./environment.repository";

const MAX_BUNDLE_SIZE = 100 * 1024 * 1024; // 100 MB

@singleton()
export class EnvBundleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envRepository: EnvironmentRepository,
  ) {}

  /** Assemble a zip bundle of selected env variables and secret files. */
  async createBundle(projectId: string, body: EnvBundleBody, userId: string, ipAddress: string) {
    const groupName = await this.envRepository.getVaultGroupName(body.vaultGroupId);

    const env = await this.envRepository.requireEnvironment(
      body.vaultGroupId,
      body.environmentType,
    );

    if (body.variableIds.length === 0 && body.secretFileIds.length === 0) {
      throw new BadRequestError("At least one variable or secret file must be selected");
    }

    const projectKey = deriveProjectKey(projectId);
    const zipFiles: Record<string, Uint8Array> = {};
    let totalSize = 0;

    if (body.variableIds.length > 0) {
      const variables = await this.prisma.envVariable.findMany({
        where: { id: { in: body.variableIds }, environmentId: env.id },
      });

      if (variables.length !== body.variableIds.length) {
        throw new BadRequestError("One or more variable IDs are invalid");
      }

      const entries = variables.map((v) => ({
        key: v.key,
        value: decrypt(v.encryptedValue, v.iv, v.authTag, projectKey),
      }));

      const content = SERIALIZERS[body.format].serialize(entries);
      const encoded = new TextEncoder().encode(content);
      totalSize += encoded.byteLength;
      zipFiles[getConfigFileName(body.format)] = encoded;
    }

    if (body.secretFileIds.length > 0) {
      const files = await this.prisma.secretFile.findMany({
        where: { id: { in: body.secretFileIds }, environmentId: env.id },
      });

      if (files.length !== body.secretFileIds.length) {
        throw new BadRequestError("One or more secret file IDs are invalid");
      }

      for (const file of files) {
        const decrypted = decryptBinary(
          Buffer.from(file.encryptedContent),
          file.iv,
          file.authTag,
          projectKey,
        );
        totalSize += decrypted.byteLength;
        zipFiles[file.name] = new Uint8Array(decrypted);
      }
    }

    if (totalSize > MAX_BUNDLE_SIZE) {
      throw new BadRequestError(
        `Bundle size (${Math.round(totalSize / 1024 / 1024)} MB) exceeds the 100 MB limit`,
      );
    }

    const zipped = zipSync(zipFiles);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: env.id,
      ipAddress,
      metadata: {
        type: "bundle",
        format: body.format,
        variableCount: body.variableIds.length,
        fileCount: body.secretFileIds.length,
        vaultGroupName: groupName,
      },
    });

    const envType = body.environmentType.toLowerCase();
    return {
      data: Buffer.from(zipped).toString("base64"),
      fileName: `${envType}-bundle.zip`,
    };
  }
}
