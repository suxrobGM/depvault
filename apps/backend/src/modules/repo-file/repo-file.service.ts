import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient, type RepoFile } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { MessageResponse, PaginatedResponse } from "@/types/response";
import { toRepoFileContentResponse, toRepoFileResponse } from "./repo-file.mapper";
import type {
  PushRepoFileBody,
  RepoFileContentResponse,
  RepoFileListQuery,
  RepoFileResponse,
  RepoFileVersionListResponse,
  SaveRepoFileBody,
  UpdateRepoFileBody,
} from "./repo-file.schema";
import { validateRepoFile } from "./repo-file.validator";

const APP_SELECT = { app: { select: { id: true, name: true, appPath: true } } } as const;

type RepoFileWithApp = RepoFile & { app: { id: string; name: string; appPath: string } };

/** CRUD + version history for the unified RepoFile model (CONFIG and SECRET kinds). */
@singleton()
export class RepoFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly appRepository: AppRepository,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  /**
   * Push a file from the CLI. Upserts the owning app, then creates the file or replaces an
   * existing one (snapshotting the prior content as a version). Identity is `(projectId,
   * relativePath)`; `appId` is updated when the file re-groups under a different app.
   */
  async push(
    projectId: string,
    userId: string,
    body: PushRepoFileBody,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "repoFile");
    validateRepoFile(body.kind, body.relativePath, body.fileSize);

    const app = await this.appRepository.upsertByPath(projectId, body.appPath, body.appName);
    const content = new Uint8Array(Buffer.from(body.encryptedContent, "base64"));

    const existing = await this.prisma.repoFile.findUnique({
      where: { projectId_relativePath: { projectId, relativePath: body.relativePath } },
    });

    let file: RepoFileWithApp;
    if (existing) {
      await this.snapshotVersion(existing, userId, "push");
      file = await this.prisma.repoFile.update({
        where: { id: existing.id },
        data: {
          appId: app.id,
          kind: body.kind,
          environmentSlug: body.environmentSlug ?? null,
          format: body.format ?? null,
          mimeType: body.mimeType ?? null,
          description: body.description ?? null,
          encryptedContent: content,
          iv: body.iv,
          authTag: body.authTag,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
        },
        include: APP_SELECT,
      });
    } else {
      file = await this.prisma.repoFile.create({
        data: {
          projectId,
          appId: app.id,
          kind: body.kind,
          relativePath: body.relativePath,
          environmentSlug: body.environmentSlug ?? null,
          format: body.format ?? null,
          mimeType: body.mimeType ?? null,
          description: body.description ?? null,
          encryptedContent: content,
          iv: body.iv,
          authTag: body.authTag,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
          createdBy: userId,
        },
        include: APP_SELECT,
      });
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "REPO_FILE",
      resourceId: file.id,
      ipAddress,
      metadata: {
        kind: body.kind,
        appPath: body.appPath,
        relativePath: body.relativePath,
        environmentSlug: body.environmentSlug ?? null,
      },
    });

    return toRepoFileResponse(file, file.app);
  }

  /**
   * Save an edited file from the web app. Snapshots the current content as a version, then
   * replaces it with the new client-encrypted blob.
   */
  async webSave(
    projectId: string,
    fileId: string,
    userId: string,
    body: SaveRepoFileBody,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    const existing = await this.findFileOrThrow(projectId, fileId);
    await this.snapshotVersion(existing, userId, body.message ?? null);

    const updated = await this.prisma.repoFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: new Uint8Array(Buffer.from(body.encryptedContent, "base64")),
        iv: body.iv,
        authTag: body.authTag,
        fileSize: body.fileSize,
        isBinary: body.isBinary,
      },
      include: APP_SELECT,
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "REPO_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: updated.relativePath, environmentSlug: updated.environmentSlug },
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** Update file metadata only — never moves the file across apps or paths. */
  async update(
    projectId: string,
    fileId: string,
    body: UpdateRepoFileBody,
  ): Promise<RepoFileResponse> {
    await this.findFileOrThrow(projectId, fileId);

    const updated = await this.prisma.repoFile.update({
      where: { id: fileId },
      data: {
        ...(body.description !== undefined && { description: body.description }),
        ...(body.environmentSlug !== undefined && { environmentSlug: body.environmentSlug }),
      },
      include: APP_SELECT,
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** List file metadata (no encrypted blob) for a project, optionally filtered. */
  async list(
    projectId: string,
    query: RepoFileListQuery,
  ): Promise<PaginatedResponse<RepoFileResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      projectId,
      ...(query.appId && { appId: query.appId }),
      ...(query.environmentSlug && { environmentSlug: query.environmentSlug }),
      ...(query.kind && { kind: query.kind }),
    };

    const [files, total] = await Promise.all([
      this.prisma.repoFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { relativePath: "asc" },
        include: APP_SELECT,
      }),
      this.prisma.repoFile.count({ where }),
    ]);

    return {
      items: files.map((f) => toRepoFileResponse(f, f.app)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Return the encrypted blob and crypto params for a file (decryption is client-side). */
  async getContent(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<RepoFileContentResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "REPO_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: file.relativePath, kind: file.kind },
    });

    return toRepoFileContentResponse(file, file.app);
  }

  /** List version history metadata (no blob) for a file, newest first. */
  async listVersions(projectId: string, fileId: string): Promise<RepoFileVersionListResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    const versions = await this.prisma.repoFileVersion.findMany({
      where: { repoFileId: file.id },
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
  ): Promise<RepoFileContentResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    const version = await this.findVersionOrThrow(file.id, versionId);

    return {
      ...toRepoFileResponse(file, file.app),
      fileSize: version.fileSize,
      isBinary: version.isBinary,
      encryptedContent: Buffer.from(version.encryptedContent).toString("base64"),
      iv: version.iv,
      authTag: version.authTag,
    };
  }

  /** Restore a file to a previous version, snapshotting the current content first. */
  async restoreVersion(
    projectId: string,
    fileId: string,
    versionId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    const version = await this.findVersionOrThrow(file.id, versionId);

    await this.snapshotVersion(file, userId, "restore");

    const updated = await this.prisma.repoFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: version.encryptedContent,
        iv: version.iv,
        authTag: version.authTag,
        fileSize: version.fileSize,
        isBinary: version.isBinary,
      },
      include: APP_SELECT,
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPDATE",
      resourceType: "REPO_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: updated.relativePath, restoredFrom: versionId },
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** Permanently delete a file and its version history. */
  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<MessageResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    await this.prisma.repoFile.delete({ where: { id: fileId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "REPO_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: file.relativePath, kind: file.kind },
    });

    return { message: "File deleted successfully" };
  }

  private async snapshotVersion(
    file: RepoFile,
    userId: string,
    message: string | null,
  ): Promise<void> {
    await this.prisma.repoFileVersion.create({
      data: {
        repoFileId: file.id,
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

  private async findFileOrThrow(projectId: string, fileId: string): Promise<RepoFileWithApp> {
    const file = await this.prisma.repoFile.findFirst({
      where: { id: fileId, projectId },
      include: APP_SELECT,
    });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    return file;
  }

  private async findVersionOrThrow(repoFileId: string, versionId: string) {
    const version = await this.prisma.repoFileVersion.findFirst({
      where: { id: versionId, repoFileId },
    });

    if (!version) {
      throw new NotFoundError("File version not found");
    }

    return version;
  }
}
