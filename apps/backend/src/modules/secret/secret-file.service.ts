import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { decryptBinary, deriveProjectKey, encryptBinary } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification/notification.service";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import { toSecretFileResponse } from "./secret-file.mapper";
import type { SecretFileResponse, UpdateSecretFileBody } from "./secret-file.schema";
import { validateFile, validateFileName } from "./secret-file.validator";

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
    file: File,
    vaultGroupId: string,
    description?: string,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "secretFile");

    validateFile(file);

    const vaultGroup = await this.prisma.vaultGroup.findFirst({
      where: { id: vaultGroupId, projectId },
    });
    if (!vaultGroup) {
      throw new NotFoundError("Vault group not found");
    }

    const projectKey = deriveProjectKey(projectId);

    const existing = await this.prisma.secretFile.findUnique({
      where: { vaultGroupId_name: { vaultGroupId, name: file.name } },
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { ciphertext, iv, authTag } = encryptBinary(fileBuffer, projectKey);

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
          description,
          encryptedContent: new Uint8Array(ciphertext),
          iv,
          authTag,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        },
      });
    } else {
      secretFile = await this.prisma.secretFile.create({
        data: {
          vaultGroupId,
          name: file.name,
          description,
          encryptedContent: new Uint8Array(ciphertext),
          iv,
          authTag,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
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
      metadata: { fileName: file.name, vaultGroupName: vaultGroup.name },
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
  ): Promise<{ buffer: Buffer; name: string; mimeType: string }> {
    const file = await this.findFileOrThrow(projectId, fileId);

    const projectKey = deriveProjectKey(projectId);
    const decrypted = decryptBinary(
      Buffer.from(file.encryptedContent),
      file.iv,
      file.authTag,
      projectKey,
    );

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { fileName: file.name, vaultGroupName: file.vaultGroup.name },
    });

    return { buffer: decrypted, name: file.name, mimeType: file.mimeType };
  }

  async uploadNewVersion(
    projectId: string,
    fileId: string,
    userId: string,
    file: File,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    validateFile(file);

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

    const projectKey = deriveProjectKey(projectId);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { ciphertext, iv, authTag } = encryptBinary(fileBuffer, projectKey);

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        encryptedContent: new Uint8Array(ciphertext),
        iv,
        authTag,
        mimeType: file.type ?? "application/octet-stream",
        fileSize: file.size,
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
        fileName: file.name,
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
