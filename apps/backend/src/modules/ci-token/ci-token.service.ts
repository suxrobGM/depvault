import { deriveCIWrapKey, unwrapKey, wrapKey } from "@depvault/crypto";
import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { isIpInAllowlist, validateIpAllowlist } from "@/common/utils/ip";
import { createRandomToken, hashToken } from "@/common/utils/password";
import { PrismaClient, type CiToken } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { PaginatedResponse } from "@/types/response";
import type {
  CiConfigFile,
  CiFileDownloadResponse,
  CiSecretFile,
  CiSecretsResponse,
  CiTokenCreatedResponse,
  CiTokenResponse,
  CreateCiTokenBody,
} from "./ci-token.schema";

const TOKEN_PREFIX = "dvci_";
const MAX_EXPIRY_SECONDS = 31536000; // 1 year
const BASE_ENVIRONMENT = "base";

@singleton()
export class CiTokenService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  /** Generate a CI token scoped to an app + environment, re-wrapping the client DEK under the token key. */
  async create(
    projectId: string,
    userId: string,
    body: CreateCiTokenBody,
    ipAddress: string,
  ): Promise<CiTokenCreatedResponse> {
    await this.planEnforcement.enforceForProject(projectId, "ciToken");

    const app = await this.prisma.app.findFirst({
      where: { id: body.appId, projectId },
    });
    if (!app) {
      throw new NotFoundError("App not found in this project");
    }

    const ipAllowlist = body.ipAllowlist ?? [];

    if (ipAllowlist.length > 0) {
      const error = validateIpAllowlist(ipAllowlist);
      if (error) throw new BadRequestError(error);
    }

    if (body.expiresIn > MAX_EXPIRY_SECONDS) {
      throw new BadRequestError("Expiry cannot exceed 1 year");
    }

    const rawToken = TOKEN_PREFIX + createRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 8);
    const expiresAt = new Date(Date.now() + body.expiresIn * 1000);

    // Re-wrap the client-sent DEK from the placeholder key to the real token-derived key
    const placeholderKey = await deriveCIWrapKey(body.wrapPlaceholder);
    const dekBytes = await unwrapKey(
      body.wrappedDek,
      body.wrappedDekIv,
      body.wrappedDekTag,
      placeholderKey,
    );
    const realKey = await deriveCIWrapKey(rawToken);
    const wrapped = await wrapKey(dekBytes, realKey);

    const ciToken = await this.prisma.ciToken.create({
      data: {
        projectId,
        appId: body.appId,
        environmentSlug: body.environmentSlug,
        createdBy: userId,
        name: body.name,
        tokenHash,
        tokenPrefix,
        ipAllowlist,
        expiresAt,
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "CREATE",
      resourceType: "CI_TOKEN",
      resourceId: ciToken.id,
      ipAddress,
      metadata: { name: body.name, appName: app.name, environmentSlug: body.environmentSlug },
    });

    return {
      id: ciToken.id,
      token: rawToken,
      tokenPrefix,
      expiresAt,
    };
  }

  async list(projectId: string, page = 1, limit = 20): Promise<PaginatedResponse<CiTokenResponse>> {
    const where = { projectId };
    const [tokens, total] = await Promise.all([
      this.prisma.ciToken.findMany({
        where,
        include: {
          creator: { select: { email: true } },
          app: { select: { name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ciToken.count({ where }),
    ]);

    const items: CiTokenResponse[] = tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      projectId: token.projectId,
      appId: token.appId,
      appName: token.app.name,
      environmentSlug: token.environmentSlug,
      ipAllowlist: token.ipAllowlist,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      createdByEmail: token.creator.email,
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async revoke(
    projectId: string,
    tokenId: string,
    userId: string,
    ipAddress: string,
  ): Promise<{ message: string }> {
    const ciToken = await this.prisma.ciToken.findFirst({
      where: { id: tokenId, projectId },
    });

    if (!ciToken) {
      throw new NotFoundError("CI token not found");
    }

    await this.prisma.ciToken.delete({ where: { id: tokenId } });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "CI_TOKEN",
      resourceId: tokenId,
      ipAddress,
      metadata: { name: ciToken.name },
    });

    return { message: "CI token deleted" };
  }

  async validateToken(rawToken: string, clientIp: string): Promise<CiToken> {
    const tokenHash = hashToken(rawToken);

    const ciToken = await this.prisma.ciToken.findUnique({
      where: { tokenHash },
    });

    if (!ciToken) {
      throw new UnauthorizedError("Invalid CI token");
    }
    if (ciToken.expiresAt < new Date()) {
      throw new UnauthorizedError("CI token has expired");
    }

    if (ciToken.ipAllowlist.length > 0 && !isIpInAllowlist(clientIp, ciToken.ipAllowlist)) {
      throw new ForbiddenError("IP address not in allowlist");
    }

    await this.prisma.ciToken.update({
      where: { id: ciToken.id },
      data: { lastUsedAt: new Date() },
    });

    return ciToken;
  }

  /** Return base + token-environment config and secret file ciphertext for the token's app. */
  async fetchSecrets(
    ciToken: CiToken,
    rawToken: string,
    pipelineRunId: string | null,
    clientIp: string,
  ): Promise<CiSecretsResponse> {
    const [configFiles, secretFiles] = await Promise.all([
      this.prisma.configFile.findMany({
        where: {
          appId: ciToken.appId,
          environmentSlug: { in: [BASE_ENVIRONMENT, ciToken.environmentSlug] },
        },
      }),
      this.prisma.secretFile.findMany({
        where: {
          appId: ciToken.appId,
          OR: [
            { environmentSlug: null },
            { environmentSlug: { in: [BASE_ENVIRONMENT, ciToken.environmentSlug] } },
          ],
        },
      }),
    ]);

    const configFileList: CiConfigFile[] = configFiles.map((f) => ({
      relativePath: f.relativePath,
      format: f.format,
      environmentSlug: f.environmentSlug,
      encryptedContent: Buffer.from(f.encryptedContent).toString("base64"),
      iv: f.iv,
      authTag: f.authTag,
      isBinary: f.isBinary,
    }));

    const secretFileList: CiSecretFile[] = secretFiles.map((f) => ({
      id: f.id,
      relativePath: f.relativePath,
      environmentSlug: f.environmentSlug,
      mimeType: f.mimeType,
      encryptedContent: Buffer.from(f.encryptedContent).toString("base64"),
      iv: f.iv,
      authTag: f.authTag,
      isBinary: f.isBinary,
    }));

    await this.auditLogService.log({
      projectId: ciToken.projectId,
      action: "READ",
      resourceType: "CI_TOKEN",
      resourceId: ciToken.id,
      ipAddress: clientIp,
      metadata: {
        pipelineRunId: pipelineRunId ?? null,
        configFileCount: configFileList.length,
        secretFileCount: secretFileList.length,
      },
    });

    return {
      wrappedDek: ciToken.wrappedDek,
      wrappedDekIv: ciToken.wrappedDekIv,
      wrappedDekTag: ciToken.wrappedDekTag,
      configFiles: configFileList,
      secretFiles: secretFileList,
    };
  }

  async downloadFile(ciToken: CiToken, fileId: string): Promise<CiFileDownloadResponse> {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, appId: ciToken.appId },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    return {
      encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
      iv: file.iv,
      authTag: file.authTag,
      relativePath: file.relativePath,
      mimeType: file.mimeType,
    };
  }
}
