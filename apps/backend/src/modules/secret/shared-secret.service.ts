import { randomBytes } from "node:crypto";
import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, GoneError, NotFoundError } from "@/common/errors";
import { decrypt, decryptBinary, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { createRandomToken, hashPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type {
  AccessEnvSecretResponse,
  AccessFileSecretResponse,
  CreateEnvShareBody,
  CreateFileShareBody,
  SharedSecretAuditItem,
} from "./shared-secret.schema";

const SHARE_URL_BASE = process.env.FRONTEND_URL!;

@singleton()
export class SharedSecretService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createForEnvVariables(
    projectId: string,
    userId: string,
    body: CreateEnvShareBody,
    ipAddress = "unknown",
  ): Promise<{ token: string; shareUrl: string }> {
    await this.requireEditorOrOwner(projectId, userId);

    const variables = await this.prisma.envVariable.findMany({
      where: { id: { in: body.variableIds }, environment: { projectId } },
    });

    if (variables.length === 0) {
      throw new NotFoundError("No matching variables found in this project");
    }

    const projectKey = deriveProjectKey(projectId);
    const decrypted = variables.map((v) => ({
      key: v.key,
      value: decrypt(v.encryptedValue, v.iv, v.authTag, projectKey),
    }));

    const { ciphertext, iv, authTag } = encrypt(JSON.stringify(decrypted), projectKey);
    const token = createRandomToken();
    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    const secret = await this.prisma.sharedSecret.create({
      data: {
        creatorId: userId,
        projectId,
        token,
        encryptedPayload: ciphertext,
        iv,
        authTag,
        passwordHash,
        payloadType: "ENV_VARIABLES",
        expiresAt,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "SHARE",
      resourceType: "SHARE_LINK",
      resourceId: secret.id,
      ipAddress,
      metadata: { payloadType: "ENV_VARIABLES", variableCount: variables.length },
    });

    return { token, shareUrl: `${SHARE_URL_BASE}/s/${token}` };
  }

  async createForFile(
    projectId: string,
    userId: string,
    fileId: string,
    body: CreateFileShareBody,
    ipAddress = "unknown",
  ): Promise<{ token: string; shareUrl: string }> {
    await this.requireEditorOrOwner(projectId, userId);

    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environment: { projectId } },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    const projectKey = deriveProjectKey(projectId);
    const decryptedBuffer = decryptBinary(
      Buffer.from(file.encryptedContent),
      file.iv,
      file.authTag,
      projectKey,
    );

    const { ciphertext, iv, authTag } = encrypt(decryptedBuffer.toString("base64"), projectKey);

    const token = createRandomToken();
    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    const secret = await this.prisma.sharedSecret.create({
      data: {
        creatorId: userId,
        projectId,
        token,
        encryptedPayload: ciphertext,
        iv,
        authTag,
        passwordHash,
        payloadType: "SECRET_FILE",
        fileName: file.name,
        mimeType: file.mimeType,
        expiresAt,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "SHARE",
      resourceType: "SHARE_LINK",
      resourceId: secret.id,
      ipAddress,
      metadata: { payloadType: "SECRET_FILE", fileName: file.name },
    });

    return { token, shareUrl: `${SHARE_URL_BASE}/s/${token}` };
  }

  async getInfo(token: string): Promise<{
    payloadType: "ENV_VARIABLES" | "SECRET_FILE";
    hasPassword: boolean;
    fileName: string | null;
    mimeType: string | null;
    expiresAt: Date;
  }> {
    const secret = await this.prisma.sharedSecret.findUnique({ where: { token } });

    if (!secret) throw new NotFoundError("Secret link not found or already consumed");

    if (secret.status === "VIEWED") {
      throw new GoneError("This secret has already been accessed and is no longer available");
    }

    if (secret.status === "EXPIRED" || secret.expiresAt < new Date()) {
      if (secret.status !== "EXPIRED") {
        await this.prisma.sharedSecret.update({
          where: { id: secret.id },
          data: { status: "EXPIRED" },
        });
      }
      throw new GoneError("This secret link has expired");
    }

    return {
      payloadType: secret.payloadType as "ENV_VARIABLES" | "SECRET_FILE",
      hasPassword: secret.passwordHash !== null,
      fileName: secret.fileName,
      mimeType: secret.mimeType,
      expiresAt: secret.expiresAt,
    };
  }

  async access(
    token: string,
    password?: string,
    ipAddress = "unknown",
  ): Promise<AccessEnvSecretResponse | AccessFileSecretResponse> {
    const secret = await this.findConsumableSecret(token);
    await this.verifyPassword(secret, password);

    const projectKey = deriveProjectKey(secret.projectId);
    const decryptedPayload = decrypt(
      secret.encryptedPayload,
      secret.iv,
      secret.authTag,
      projectKey,
    );

    await this.consumeSecret(secret.id);

    await this.auditLogService.log({
      projectId: secret.projectId,
      action: "READ",
      resourceType: "SHARE_LINK",
      resourceId: secret.id,
      ipAddress,
      metadata: { payloadType: secret.payloadType },
    });

    if (secret.payloadType === "ENV_VARIABLES") {
      return { payloadType: "ENV_VARIABLES", variables: JSON.parse(decryptedPayload) };
    }

    return {
      payloadType: "SECRET_FILE",
      fileName: secret.fileName!,
      mimeType: secret.mimeType!,
      content: decryptedPayload, // already base64
    };
  }

  async list(projectId: string, userId: string): Promise<{ items: SharedSecretAuditItem[] }> {
    await this.requireEditorOrOwner(projectId, userId);

    // Expire stale records inline before listing
    await this.prisma.sharedSecret.updateMany({
      where: { projectId, status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    const secrets = await this.prisma.sharedSecret.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: secrets.map((s) => ({
        id: s.id,
        token: s.token,
        payloadType: s.payloadType as "ENV_VARIABLES" | "SECRET_FILE",
        status: s.status as "PENDING" | "VIEWED" | "EXPIRED",
        hasPassword: s.passwordHash !== null,
        fileName: s.fileName,
        expiresAt: s.expiresAt,
        viewedAt: s.viewedAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async revoke(
    projectId: string,
    secretId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<{ message: string }> {
    await this.requireEditorOrOwner(projectId, userId);

    const secret = await this.prisma.sharedSecret.findFirst({
      where: { id: secretId, projectId },
    });

    if (!secret) throw new NotFoundError("Shared secret not found");
    if (secret.status !== "PENDING") {
      throw new BadRequestError("Only pending secrets can be revoked");
    }

    await this.prisma.sharedSecret.delete({ where: { id: secretId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "SHARE_LINK",
      resourceId: secretId,
      ipAddress,
    });

    return { message: "Shared secret revoked" };
  }

  private async findConsumableSecret(token: string) {
    const secret = await this.prisma.sharedSecret.findUnique({ where: { token } });

    if (!secret) throw new NotFoundError("Secret link not found or already consumed");

    if (secret.status === "VIEWED") {
      throw new GoneError("This secret has already been accessed and is no longer available");
    }

    if (secret.status === "EXPIRED" || secret.expiresAt < new Date()) {
      await this.prisma.sharedSecret.update({
        where: { id: secret.id },
        data: { status: "EXPIRED" },
      });
      throw new GoneError("This secret link has expired");
    }

    return secret;
  }

  private async verifyPassword(secret: { passwordHash: string | null }, password?: string) {
    if (!secret.passwordHash) return;

    if (!password) {
      throw new BadRequestError("This secret is password-protected");
    }

    const valid = await Bun.password.verify(password, secret.passwordHash);
    if (!valid) {
      throw new BadRequestError("Incorrect password");
    }
  }

  private async consumeSecret(secretId: string) {
    await this.prisma.sharedSecret.update({
      where: { id: secretId },
      data: {
        status: "VIEWED",
        viewedAt: new Date(),
        encryptedPayload: "",
        iv: "",
        authTag: "",
      },
    });
  }

  private async requireEditorOrOwner(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) throw new NotFoundError("Project not found");

    if (member.role !== "OWNER" && member.role !== "EDITOR") {
      throw new ForbiddenError("Only owners and editors can manage shared secrets");
    }

    return member;
  }
}
