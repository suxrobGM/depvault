import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { MessageResponse, PaginatedResponse } from "@/types/response";
import { toSecretFileResponse } from "./secret-file.mapper";
import type {
  PushSecretFileBody,
  SecretFileDownloadResponse,
  SecretFileResponse,
  UpdateSecretFileBody,
} from "./secret-file.schema";
import { validateFileName } from "./secret-file.validator";

@singleton()
export class SecretFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
    private readonly planEnforcement: PlanEnforcementService,
    private readonly appRepository: AppRepository,
  ) {}

  async notifyGitSecretDetected(
    projectId: string,
    userId: string,
    fileName: string,
  ): Promise<void> {
    void this.notificationService.notify({
      type: "GIT_SECRET_DETECTION",
      userId,
      projectId,
      fileName,
    });
  }

  /**
   * Upsert a client-encrypted secret file at its repo-relative path under an app.
   * The app is resolved/created by `(projectId, appPath)`; on an existing file the
   * previous blob is snapshotted as a version before the row is replaced.
   */
  async push(
    projectId: string,
    userId: string,
    body: PushSecretFileBody,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "secretFile");

    validateFileName(body.relativePath);

    const app = await this.appRepository.upsertByPath(projectId, body.appPath, body.appName);

    const encryptedContent = new Uint8Array(Buffer.from(body.encryptedContent, "base64"));

    const existing = await this.prisma.secretFile.findUnique({
      where: { appId_relativePath: { appId: app.id, relativePath: body.relativePath } },
    });

    let secretFile;
    if (existing) {
      await this.prisma.secretFileVersion.create({
        data: {
          secretFileId: existing.id,
          encryptedContent: existing.encryptedContent,
          iv: existing.iv,
          authTag: existing.authTag,
          fileSize: existing.fileSize,
          isBinary: existing.isBinary,
          changedBy: userId,
        },
      });

      secretFile = await this.prisma.secretFile.update({
        where: { id: existing.id },
        data: {
          environmentSlug: body.environmentSlug ?? null,
          description: body.description,
          encryptedContent,
          iv: body.iv,
          authTag: body.authTag,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
        },
      });
    } else {
      secretFile = await this.prisma.secretFile.create({
        data: {
          appId: app.id,
          relativePath: body.relativePath,
          environmentSlug: body.environmentSlug ?? null,
          description: body.description,
          encryptedContent,
          iv: body.iv,
          authTag: body.authTag,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
          isBinary: body.isBinary,
          uploadedBy: userId,
        },
      });
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "SECRET_FILE",
      resourceId: secretFile.id,
      ipAddress,
      metadata: { relativePath: body.relativePath, appName: app.name },
    });

    return toSecretFileResponse(secretFile, app);
  }

  async list(
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<SecretFileResponse>> {
    const where = { app: { projectId } };

    const [files, total] = await Promise.all([
      this.prisma.secretFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { app: { select: { id: true, name: true, appPath: true } } },
      }),
      this.prisma.secretFile.count({ where }),
    ]);

    return {
      items: files.map((f) => toSecretFileResponse(f, f.app)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async download(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<SecretFileDownloadResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: file.relativePath, appName: file.app.name },
    });

    return {
      encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
      iv: file.iv,
      authTag: file.authTag,
      relativePath: file.relativePath,
      mimeType: file.mimeType,
    };
  }

  /** Update secret file metadata only — never moves the file across apps or paths. */
  async update(
    projectId: string,
    fileId: string,
    data: UpdateSecretFileBody,
  ): Promise<SecretFileResponse> {
    await this.findFileOrThrow(projectId, fileId);

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.environmentSlug !== undefined && { environmentSlug: data.environmentSlug }),
      },
      include: { app: { select: { id: true, name: true, appPath: true } } },
    });

    return toSecretFileResponse(updated, updated.app);
  }

  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<MessageResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);
    await this.prisma.secretFile.delete({ where: { id: fileId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { relativePath: file.relativePath, appName: file.app.name },
    });

    return { message: "Secret file deleted successfully" };
  }

  private async findFileOrThrow(projectId: string, fileId: string) {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, app: { projectId } },
      include: { app: { select: { id: true, name: true, appPath: true } } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    return file;
  }
}
