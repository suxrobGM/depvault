import { singleton } from "tsyringe";
import { BadRequestError, GoneError, NotFoundError } from "@/common/errors";
import { createRandomToken, hashPassword } from "@/common/utils/password";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type {
  AccessShareResponse,
  CreateShareBody,
  CreateShareResponse,
  ShareLinkInfoResponse,
  ShareLinkItem,
} from "./share-link.schema";

const SHARE_URL_BASE = process.env.FRONTEND_URL!;

/** One-time, client-encrypted share links for files. The server never sees the decryption key. */
@singleton()
export class ShareLinkService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    body: CreateShareBody,
    ipAddress = "unknown",
  ): Promise<CreateShareResponse> {
    const token = createRandomToken();
    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    const shareLink = await this.prisma.shareLink.create({
      data: {
        creatorId: userId,
        projectId,
        token,
        encryptedPayload: body.encryptedPayload,
        iv: body.iv,
        authTag: body.authTag,
        passwordHash,
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
      resourceId: shareLink.id,
      ipAddress,
      metadata: { fileName: body.fileName },
    });

    return { token, shareUrl: `${SHARE_URL_BASE}/s/${token}` };
  }

  async getInfo(token: string): Promise<ShareLinkInfoResponse> {
    const shareLink = await this.prisma.shareLink.findUnique({ where: { token } });

    if (!shareLink) throw new NotFoundError("Share link not found or already consumed");

    if (shareLink.status === "VIEWED") {
      throw new GoneError("This share link has already been accessed and is no longer available");
    }

    if (shareLink.status === "EXPIRED" || shareLink.expiresAt < new Date()) {
      if (shareLink.status !== "EXPIRED") {
        await this.prisma.shareLink.update({
          where: { id: shareLink.id },
          data: { status: "EXPIRED" },
        });
      }
      throw new GoneError("This share link has expired");
    }

    return {
      hasPassword: shareLink.passwordHash !== null,
      fileName: shareLink.fileName,
      mimeType: shareLink.mimeType,
      expiresAt: shareLink.expiresAt,
    };
  }

  async access(
    token: string,
    password?: string,
    ipAddress = "unknown",
  ): Promise<AccessShareResponse> {
    const shareLink = await this.findConsumable(token);
    await this.verifyPassword(shareLink, password);

    const response: AccessShareResponse = {
      encryptedPayload: shareLink.encryptedPayload,
      iv: shareLink.iv,
      authTag: shareLink.authTag,
      fileName: shareLink.fileName,
      mimeType: shareLink.mimeType,
    };

    await this.consume(shareLink.id);

    await this.auditLogService.log({
      projectId: shareLink.projectId,
      action: "READ",
      resourceType: "SHARE_LINK",
      resourceId: shareLink.id,
      ipAddress,
    });

    return response;
  }

  async list(projectId: string): Promise<{ items: ShareLinkItem[] }> {
    await this.prisma.shareLink.updateMany({
      where: { projectId, status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    const shareLinks = await this.prisma.shareLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: shareLinks.map((s) => ({
        id: s.id,
        token: s.token,
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
    shareId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<{ message: string }> {
    const shareLink = await this.prisma.shareLink.findFirst({
      where: { id: shareId, projectId },
    });

    if (!shareLink) throw new NotFoundError("Share link not found");
    if (shareLink.status !== "PENDING") {
      throw new BadRequestError("Only pending share links can be revoked");
    }

    await this.prisma.shareLink.delete({ where: { id: shareId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "SHARE_LINK",
      resourceId: shareId,
      ipAddress,
    });

    return { message: "Share link revoked" };
  }

  private async findConsumable(token: string) {
    const shareLink = await this.prisma.shareLink.findUnique({ where: { token } });

    if (!shareLink) throw new NotFoundError("Share link not found or already consumed");

    if (shareLink.status === "VIEWED") {
      throw new GoneError("This share link has already been accessed and is no longer available");
    }

    if (shareLink.status === "EXPIRED" || shareLink.expiresAt < new Date()) {
      await this.prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { status: "EXPIRED" },
      });
      throw new GoneError("This share link has expired");
    }

    return shareLink;
  }

  private async verifyPassword(shareLink: { passwordHash: string | null }, password?: string) {
    if (!shareLink.passwordHash) return;

    if (!password) {
      throw new BadRequestError("This share link is password-protected");
    }

    const valid = await Bun.password.verify(password, shareLink.passwordHash);
    if (!valid) {
      throw new BadRequestError("Incorrect password");
    }
  }

  private async consume(shareId: string) {
    await this.prisma.shareLink.update({
      where: { id: shareId },
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
