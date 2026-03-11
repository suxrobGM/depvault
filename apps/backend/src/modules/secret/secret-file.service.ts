import { singleton } from "tsyringe";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { decryptBinary, deriveProjectKey, encryptBinary } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { NotificationService } from "@/modules/notification";
import type { PaginatedResponse } from "@/types/response";
import type { SecretFileResponse, UpdateSecretFileBody } from "./secret-file.schema";
import { validateFile, validateFileName } from "./secret-file.validator";

@singleton()
export class SecretFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
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
    environmentType: EnvironmentType,
    description?: string,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.requireEditorOrOwner(projectId, userId);

    validateFile(file);

    const environment = await this.findOrCreateEnvironment(
      projectId,
      vaultGroupId,
      environmentType,
    );
    const projectKey = deriveProjectKey(projectId);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { ciphertext, iv, authTag } = encryptBinary(fileBuffer, projectKey);

    const secretFile = await this.prisma.secretFile.create({
      data: {
        environmentId: environment.id,
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

    await this.logAudit(projectId, userId, "UPLOADED", secretFile.id);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "SECRET_FILE",
      resourceId: secretFile.id,
      ipAddress,
      metadata: { fileName: file.name },
    });

    return this.toResponse(secretFile);
  }

  async list(
    projectId: string,
    userId: string,
    environmentType?: EnvironmentType,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<SecretFileResponse>> {
    await this.requireMember(projectId, userId);

    const environmentFilter = environmentType
      ? { environment: { projectId, type: environmentType } }
      : { environment: { projectId } };

    const where = { ...environmentFilter };

    const [files, total] = await Promise.all([
      this.prisma.secretFile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          environmentId: true,
          name: true,
          description: true,
          mimeType: true,
          fileSize: true,
          uploadedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.secretFile.count({ where }),
    ]);

    return {
      items: files,
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
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.findFileOrThrow(projectId, fileId);

    const projectKey = deriveProjectKey(projectId);
    const decrypted = decryptBinary(
      Buffer.from(file.encryptedContent),
      file.iv,
      file.authTag,
      projectKey,
    );

    await this.logAudit(projectId, userId, "DOWNLOADED", fileId);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { fileName: file.name },
    });

    return { buffer: decrypted, name: file.name, mimeType: file.mimeType };
  }

  async update(
    projectId: string,
    fileId: string,
    userId: string,
    data: UpdateSecretFileBody,
  ): Promise<SecretFileResponse> {
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.findFileOrThrow(projectId, fileId);

    if (data.name) {
      validateFileName(data.name);
    }

    let environmentId = file.environmentId;
    if (data.environmentType && data.vaultGroupId) {
      const environment = await this.findOrCreateEnvironment(
        projectId,
        data.vaultGroupId,
        data.environmentType,
      );
      environmentId = environment.id;
    }

    const updated = await this.prisma.secretFile.update({
      where: { id: fileId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.environmentType && { environmentId }),
      },
    });

    return this.toResponse(updated);
  }

  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<{ message: string }> {
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.findFileOrThrow(projectId, fileId);
    await this.prisma.secretFile.delete({ where: { id: fileId } });
    await this.logAudit(projectId, userId, "DELETED", fileId);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "SECRET_FILE",
      resourceId: fileId,
      ipAddress,
      metadata: { fileName: file.name },
    });

    return { message: "Secret file deleted successfully" };
  }

  private async findFileOrThrow(projectId: string, fileId: string) {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    return file;
  }

  private async findOrCreateEnvironment(
    projectId: string,
    vaultGroupId: string,
    type: EnvironmentType,
  ) {
    const existing = await this.prisma.environment.findUnique({
      where: { vaultGroupId_type: { vaultGroupId, type } },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: { projectId, vaultGroupId, type },
    });
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundError("Project not found");
    }

    return member;
  }

  private async requireEditorOrOwner(projectId: string, userId: string) {
    const member = await this.requireMember(projectId, userId);

    if (member.role !== "OWNER" && member.role !== "EDITOR") {
      throw new ForbiddenError("Only owners and editors can manage secret files");
    }

    return member;
  }

  private async logAudit(
    projectId: string,
    userId: string,
    action: "UPLOADED" | "DOWNLOADED" | "DELETED",
    fileId: string,
  ) {
    try {
      await this.prisma.secretFileAuditLog.create({
        data: {
          secretFileId: fileId,
          userId,
          action,
        },
      });
    } catch {
      logger.warn({ projectId, userId, action, fileId }, "Failed to create audit log entry");
    }
  }

  private toResponse(file: {
    id: string;
    environmentId: string;
    name: string;
    description: string | null;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): SecretFileResponse {
    return {
      id: file.id,
      environmentId: file.environmentId,
      name: file.name,
      description: file.description,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
