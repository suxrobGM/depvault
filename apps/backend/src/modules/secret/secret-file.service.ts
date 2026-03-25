import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import { toSecretFileResponse } from "./secret-file.mapper";
import type {
  SecretFileDownloadResponse,
  SecretFileResponse,
  UpdateSecretFileBody,
  UploadNewVersionBody,
  UploadSecretFileBody,
} from "./secret-file.schema";
import { validateFileName } from "./secret-file.validator";

@singleton()
export class SecretFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
    private readonly planEnforcement: PlanEnforcementService,
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

  async upload(
    projectId: string,
    userId: string,
    body: UploadSecretFileBody,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "secretFile");

    validateFileName(body.name);

    const vaultGroup = await this.prisma.vaultGroup.findFirst({
      where: { id: body.vaultGroupId, projectId },
    });
    if (!vaultGroup) {
      throw new NotFoundError("Vault group not found");
    }

    const encryptedContent = Buffer.from(body.encryptedContent, "base64");

    const existing = await this.prisma.secretFile.findUnique({
      where: { vaultGroupId_name: { vaultGroupId: body.vaultGroupId, name: body.name } },
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
          changedBy: userId,
        },
      });

      secretFile = await this.prisma.secretFile.update({
        where: { id: existing.id },
        data: {
          description: body.description,
          encryptedContent: new Uint8Array(encryptedContent),
          iv: body.iv,
          authTag: body.authTag,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
        },
      });
    } else {
      secretFile = await this.prisma.secretFile.create({
        data: {
          vaultGroupId: body.vaultGroupId,
          name: body.name,
          description: body.description,
          encryptedContent: new Uint8Array(encryptedContent),
          iv: body.iv,
          authTag: body.authTag,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
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
      metadata: { fileName: body.name, vaultGroupName: vaultGroup.name },
    });

    return toSecretFileResponse(secretFile, vaultGroup);
  }

  async list(
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<SecretFileResponse>> {
    const where = { vaultGroup: { projectId } };

    const [files, total] = await Promise.all([
      this.prisma.secretFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { vaultGroup: true },
      }),
      this.prisma.secretFile.count({ where }),
    ]);

    return {
      items: files.map((f) => toSecretFileResponse(f, f.vaultGroup)),
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
      metadata: { fileName: file.name, vaultGroupName: file.vaultGroup.name },
    });

    return {
      encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
      iv: file.iv,
      authTag: file.authTag,
      name: file.name,
      mimeType: file.mimeType,
    };
  }

  async uploadNewVersion(
    projectId: string,
    fileId: string,
    userId: string,
    body: UploadNewVersionBody,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    validateFileName(body.name);

    const existing = await this.findFileOrThrow(projectId, fileId);

    await this.prisma.secretFileVersion.create({
      data: {
        secretFileId: fileId,
        encryptedContent: existing.encryptedContent,
        iv: existing.iv,
        authTag: existing.authTag,
        fileSize: existing.fileSize,
        changedBy: userId,
      },
    });

    const encryptedContent = Buffer.from(body.encryptedContent, "base64");

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: new Uint8Array(encryptedContent),
        iv: body.iv,
        authTag: body.authTag,
        mimeType: body.mimeType,
        fileSize: body.fileSize,
      },
      include: { vaultGroup: true },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: {
        fileName: body.name,
        action: "new_version",
        vaultGroupName: existing.vaultGroup.name,
      },
    });

    return toSecretFileResponse(updated, updated.vaultGroup);
  }

  async update(
    projectId: string,
    fileId: string,
    data: UpdateSecretFileBody,
  ): Promise<SecretFileResponse> {
    const file = await this.findFileOrThrow(projectId, fileId);

    if (data.name) {
      validateFileName(data.name);
    }

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.vaultGroupId && { vaultGroupId: data.vaultGroupId }),
      },
      include: { vaultGroup: true },
    });

    return toSecretFileResponse(updated, updated.vaultGroup);
  }

  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<{ message: string }> {
    const file = await this.findFileOrThrow(projectId, fileId);
    await this.prisma.secretFile.delete({ where: { id: fileId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { fileName: file.name, vaultGroupName: file.vaultGroup.name },
    });

    return { message: "Secret file deleted successfully" };
  }

  private async findFileOrThrow(projectId: string, fileId: string) {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, vaultGroup: { projectId } },
      include: { vaultGroup: { select: { id: true, name: true } } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    return file;
  }
}
