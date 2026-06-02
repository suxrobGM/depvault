import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient, type ConfigFile } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import type { MessageResponse, PaginatedResponse } from "@/types/response";
import type {
  ConfigFileContentResponse,
  ConfigFileListQuery,
  ConfigFileResponse,
  ConfigFileVersionListResponse,
  PushConfigFileBody,
  SaveConfigFileBody,
} from "./config-file.schema";

@singleton()
export class ConfigFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly appRepository: AppRepository,
  ) {}

  /**
   * Push a config file from the CLI. Upserts the owning app, then creates the file or
   * updates an existing one (snapshotting the previous content as a version).
   */
  async push(
    projectId: string,
    userId: string,
    body: PushConfigFileBody,
    ipAddress = "unknown",
  ): Promise<ConfigFileResponse> {
    const app = await this.appRepository.upsertByPath(projectId, body.appPath, body.appName);

    const existing = await this.prisma.configFile.findUnique({
      where: { appId_relativePath: { appId: app.id, relativePath: body.relativePath } },
    });

    const content = new Uint8Array(Buffer.from(body.encryptedContent, "base64"));

    let configFile: ConfigFile;
    if (existing) {
      await this.snapshotVersion(existing, userId, "push");
      configFile = await this.prisma.configFile.update({
        where: { id: existing.id },
        data: {
          format: body.format,
          environmentSlug: body.environmentSlug,
          encryptedContent: content,
          iv: body.iv,
          authTag: body.authTag,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
        },
      });
    } else {
      configFile = await this.prisma.configFile.create({
        data: {
          appId: app.id,
          relativePath: body.relativePath,
          format: body.format,
          environmentSlug: body.environmentSlug,
          encryptedContent: content,
          iv: body.iv,
          authTag: body.authTag,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
        },
      });
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "CONFIG_FILE",
      resourceId: configFile.id,
      ipAddress,
      metadata: {
        appPath: body.appPath,
        relativePath: body.relativePath,
        environmentSlug: body.environmentSlug,
      },
    });

    return toConfigFileResponse(configFile);
  }

  /**
   * Save an edited config file from the web app. Snapshots the current content as a version,
   * then replaces it with the new client-encrypted blob.
   */
  async webSave(
    projectId: string,
    fileId: string,
    userId: string,
    body: SaveConfigFileBody,
    ipAddress = "unknown",
  ): Promise<ConfigFileResponse> {
    const existing = await this.findFileOrThrow(projectId, fileId);

    await this.snapshotVersion(existing, userId, body.message ?? null);

    const updated = await this.prisma.configFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: new Uint8Array(Buffer.from(body.encryptedContent, "base64")),
        iv: body.iv,
        authTag: body.authTag,
        fileSize: body.fileSize,
        isBinary: body.isBinary,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "CONFIG_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: updated.relativePath, environmentSlug: updated.environmentSlug },
    });

    return toConfigFileResponse(updated);
  }

  /** List config file metadata (no encrypted blob) for a project, optionally filtered. */
  async list(
    projectId: string,
    query: ConfigFileListQuery,
  ): Promise<PaginatedResponse<ConfigFileResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      app: { projectId },
      ...(query.appId && { appId: query.appId }),
      ...(query.environmentSlug && { environmentSlug: query.environmentSlug }),
    };

    const [files, total] = await Promise.all([
      this.prisma.configFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { relativePath: "asc" },
      }),
      this.prisma.configFile.count({ where }),
    ]);

    return {
      items: files.map(toConfigFileResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Return the encrypted blob and crypto params for a config file (decryption is client-side). */
  async getContent(projectId: string, fileId: string): Promise<ConfigFileContentResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    return toConfigFileContentResponse(file);
  }

  /** Permanently delete a config file and its version history. */
  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<MessageResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    await this.prisma.configFile.delete({ where: { id: fileId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "CONFIG_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: file.relativePath, environmentSlug: file.environmentSlug },
    });

    return { message: "Config file deleted successfully" };
  }

  /** List version history metadata (no blob) for a config file, newest first. */
  async listVersions(projectId: string, fileId: string): Promise<ConfigFileVersionListResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    const versions = await this.prisma.configFileVersion.findMany({
      where: { configFileId: file.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileSize: true,
        isBinary: true,
        changedBy: true,
        message: true,
        createdAt: true,
      },
    });

    return { items: versions };
  }

  /** Return the encrypted blob of a specific version (for diff or restore). */
  async getVersionContent(
    projectId: string,
    fileId: string,
    versionId: string,
  ): Promise<ConfigFileContentResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    const version = await this.findVersionOrThrow(file.id, versionId);

    return {
      id: file.id,
      appId: file.appId,
      relativePath: file.relativePath,
      format: file.format,
      environmentSlug: file.environmentSlug,
      fileSize: version.fileSize,
      isBinary: version.isBinary,
      createdAt: version.createdAt,
      updatedAt: file.updatedAt,
      encryptedContent: Buffer.from(version.encryptedContent).toString("base64"),
      iv: version.iv,
      authTag: version.authTag,
    };
  }

  /** Restore a config file to a previous version, snapshotting the current content first. */
  async restoreVersion(
    projectId: string,
    fileId: string,
    versionId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<ConfigFileResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    const version = await this.findVersionOrThrow(file.id, versionId);

    await this.snapshotVersion(file, userId, "restore");

    const updated = await this.prisma.configFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: version.encryptedContent,
        iv: version.iv,
        authTag: version.authTag,
        fileSize: version.fileSize,
        isBinary: version.isBinary,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "CONFIG_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: updated.relativePath, restoredFrom: versionId },
    });

    return toConfigFileResponse(updated);
  }

  private async snapshotVersion(
    file: ConfigFile,
    userId: string,
    message: string | null,
  ): Promise<void> {
    await this.prisma.configFileVersion.create({
      data: {
        configFileId: file.id,
        encryptedContent: file.encryptedContent,
        iv: file.iv,
        authTag: file.authTag,
        fileSize: file.fileSize,
        isBinary: file.isBinary,
        changedBy: userId,
        message,
      },
    });
  }

  private async findFileOrThrow(projectId: string, fileId: string): Promise<ConfigFile> {
    const file = await this.prisma.configFile.findFirst({
      where: { id: fileId, app: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Config file not found");
    }

    return file;
  }

  private async findVersionOrThrow(configFileId: string, versionId: string) {
    const version = await this.prisma.configFileVersion.findFirst({
      where: { id: versionId, configFileId },
    });

    if (!version) {
      throw new NotFoundError("Config file version not found");
    }

    return version;
  }
}

function toConfigFileResponse(file: ConfigFile): ConfigFileResponse {
  return {
    id: file.id,
    appId: file.appId,
    relativePath: file.relativePath,
    format: file.format,
    environmentSlug: file.environmentSlug,
    fileSize: file.fileSize,
    isBinary: file.isBinary,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

function toConfigFileContentResponse(file: ConfigFile): ConfigFileContentResponse {
  return {
    ...toConfigFileResponse(file),
    encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
    iv: file.iv,
    authTag: file.authTag,
  };
}
