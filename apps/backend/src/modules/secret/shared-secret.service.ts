import { singleton } from "tsyringe";
import { BadRequestError, GoneError, NotFoundError } from "@/common/errors";
import { createRandomToken, hashPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type {
  AccessSecretResponse,
  CreateEnvShareBody,
  CreateFileShareBody,
  CreateShareResponse,
  SharedSecretAuditItem,
  SharedSecretInfoResponse,
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
  ): Promise<CreateShareResponse> {
    const token = createRandomToken();
    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    const secret = await this.prisma.sharedSecret.create({
      data: {
        creatorId: userId,
        projectId,
        token,
        encryptedPayload: body.encryptedPayload,
        iv: body.iv,
        authTag: body.authTag,
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
      metadata: {
        payloadType: "ENV_VARIABLES",
        variableCount: body.variableIds?.length ?? 0,
      },
    });

    return { token, shareUrl: `${SHARE_URL_BASE}/s/${token}` };
  }

  async createForFile(
    projectId: string,
    userId: string,
    body: CreateFileShareBody,
    ipAddress = "unknown",
  ): Promise<CreateShareResponse> {
    const token = createRandomToken();
    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    const secret = await this.prisma.sharedSecret.create({
      data: {
        creatorId: userId,
        projectId,
        token,
        encryptedPayload: body.encryptedPayload,
        iv: body.iv,
        authTag: body.authTag,
        passwordHash,
        payloadType: "SECRET_FILE",
        fileName: body.fileName,
        mimeType: body.mimeType,
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
      metadata: { payloadType: "SECRET_FILE", fileName: body.fileName },
    });

    return { token, shareUrl: `${SHARE_URL_BASE}/s/${token}` };
  }

  async getInfo(token: string): Promise<SharedSecretInfoResponse> {
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
  ): Promise<AccessSecretResponse> {
    const secret = await this.findConsumableSecret(token);
    await this.verifyPassword(secret, password);

    const response: AccessSecretResponse = {
      encryptedPayload: secret.encryptedPayload,
      iv: secret.iv,
      authTag: secret.authTag,
      payloadType: secret.payloadType as "ENV_VARIABLES" | "SECRET_FILE",
      fileName: secret.fileName,
      mimeType: secret.mimeType,
    };

    await this.consumeSecret(secret.id);

    await this.auditLogService.log({
      projectId: secret.projectId,
      action: "READ",
      resourceType: "SHARE_LINK",
      resourceId: secret.id,
      ipAddress,
      metadata: { payloadType: secret.payloadType },
    });

    return response;
  }

  async list(projectId: string): Promise<{ items: SharedSecretAuditItem[] }> {
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
}
