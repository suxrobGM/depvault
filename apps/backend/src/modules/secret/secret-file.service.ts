import { injectable } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/common/errors";
import { logger } from "@/common/logger";
import { decryptBinary, deriveProjectKey, encryptBinary } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import type { PaginatedResponse } from "@/types/response";
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE, type SecretFileResponse } from "./secret-file.schema";

const PATH_TRAVERSAL_PATTERN = /(\.\.|[/\\])/;

@injectable()
export class SecretFileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  async upload(
    projectId: string,
    userId: string,
    file: File,
    environmentName: string,
    description?: string,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.requireEditorOrOwner(projectId, userId);

    this.validateFile(file);

    const environment = await this.findOrCreateEnvironment(projectId, environmentName);
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
    environmentName?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<SecretFileResponse>> {
    await this.requireMember(projectId, userId);

    const environmentFilter = environmentName
      ? { environment: { projectId, name: environmentName } }
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

    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

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

  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<{ message: string }> {
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

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

  async listVersions(projectId: string, fileId: string, userId: string) {
    await this.requireMember(projectId, userId);

    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    const versions = await this.prisma.secretFileVersion.findMany({
      where: { secretFileId: fileId },
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
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

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
    });

    return this.toResponse(updated);
  }

  private validateFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(`File size exceeds the maximum limit of 25 MB`);
    }

    const fileName = file.name;

    if (PATH_TRAVERSAL_PATTERN.test(fileName)) {
      throw new BadRequestError("Invalid filename: path traversal patterns are not allowed");
    }

    const lowerName = fileName.toLowerCase();
    for (const ext of FORBIDDEN_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        throw new BadRequestError(`Executable file type "${ext}" is not allowed`);
      }
    }
  }

  private async findOrCreateEnvironment(projectId: string, name: string) {
    const existing = await this.prisma.environment.findUnique({
      where: { projectId_name: { projectId, name } },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: { projectId, name, type: "DEVELOPMENT" },
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
