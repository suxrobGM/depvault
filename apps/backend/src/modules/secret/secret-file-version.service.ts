import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { toSecretFileResponse } from "./secret-file.mapper";
import type { SecretFileDownloadResponse, SecretFileResponse } from "./secret-file.schema";

@singleton()
export class SecretFileVersionService {
  constructor(private readonly prisma: PrismaClient) {}

  async listVersions(projectId: string, fileId: string) {
    const file = await this.findFileOrThrow(projectId, fileId);

    const versions = await this.prisma.secretFileVersion.findMany({
      where: { secretFileId: file.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        secretFileId: true,
        fileSize: true,
        changedBy: true,
        createdAt: true,
      },
    });

    return { items: versions };
  }

  async rollback(
    projectId: string,
    fileId: string,
    versionId: string,
    userId: string,
  ): Promise<SecretFileResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    const version = await this.prisma.secretFileVersion.findFirst({
      where: { id: versionId, secretFileId: fileId },
    });

    if (!version) {
      throw new NotFoundError("Version not found");
    }

    await this.prisma.secretFileVersion.create({
      data: {
        secretFileId: fileId,
        encryptedContent: file.encryptedContent,
        iv: file.iv,
        authTag: file.authTag,
        fileSize: file.fileSize,
        changedBy: userId,
      },
    });

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: version.encryptedContent,
        iv: version.iv,
        authTag: version.authTag,
        fileSize: version.fileSize,
      },
      include: { vaultGroup: true },
    });

    return toSecretFileResponse(updated, updated.vaultGroup);
  }

  async downloadVersion(
    projectId: string,
    fileId: string,
    versionId: string,
  ): Promise<SecretFileDownloadResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    const version = await this.prisma.secretFileVersion.findFirst({
      where: { id: versionId, secretFileId: fileId },
    });

    if (!version) {
      throw new NotFoundError("Version not found");
    }

    return {
      encryptedContent: Buffer.from(version.encryptedContent).toString("base64"),
      iv: version.iv,
      authTag: version.authTag,
      name: file.name,
      mimeType: file.mimeType,
    };
  }

  private async findFileOrThrow(projectId: string, fileId: string) {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, vaultGroup: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    return file;
  }
}
