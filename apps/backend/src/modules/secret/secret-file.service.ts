import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { decryptBinary, deriveProjectKey, encryptBinary } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
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
    environmentType: EnvironmentType,
    description?: string,
    ipAddress = "unknown",
  ): Promise<SecretFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "secretFile");

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

    await this.auditLogService.log({
      userId,
      projectId,
      action: "UPLOAD",
      resourceType: "SECRET_FILE",
      resourceId: secretFile.id,
      ipAddress,
      metadata: { fileName: file.name, vaultGroupName: environment.vaultGroup.name },
    });

    return toSecretFileResponse(secretFile, environment.vaultGroup);
  }

  async list(
    projectId: string,
    environmentType?: EnvironmentType,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<SecretFileResponse>> {
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
        include: { environment: { include: { vaultGroup: true } } },
      }),
      this.prisma.secretFile.count({ where }),
    ]);

    return {
      items: files.map((f) => toSecretFileResponse(f, f.environment.vaultGroup)),
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
      metadata: { fileName: file.name, vaultGroupName: file.environment.vaultGroup.name },
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
      include: { environment: { include: { vaultGroup: true } } },
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
        vaultGroupName: existing.environment.vaultGroup.name,
      },
    });

    return toSecretFileResponse(updated, updated.environment.vaultGroup);
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
      include: { environment: { include: { vaultGroup: true } } },
    });

    return toSecretFileResponse(updated, updated.environment.vaultGroup);
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
      metadata: { fileName: file.name, vaultGroupName: file.environment.vaultGroup.name },
    });

    return { message: "Secret file deleted successfully" };
  }

  private async findFileOrThrow(projectId: string, fileId: string) {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
      include: { environment: { include: { vaultGroup: { select: { name: true } } } } },
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
      include: { vaultGroup: true },
    });

    if (existing) return existing;

    return this.prisma.environment.create({
      data: { projectId, vaultGroupId, type },
      include: { vaultGroup: true },
    });
  }
}
