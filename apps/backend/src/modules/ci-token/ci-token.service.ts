import { singleton } from "tsyringe";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { decrypt, decryptBinary, deriveProjectKey } from "@/common/utils/encryption";
import { isIpInAllowlist, validateIpAllowlist } from "@/common/utils/ip";
import { createRandomToken, hashToken } from "@/common/utils/password";
import { PrismaClient, type CiToken } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type { PaginatedResponse } from "@/types/response";
import type {
  CiSecretsResponse,
  CiTokenCreatedResponse,
  CiTokenResponse,
  CreateCiTokenBody,
} from "./ci-token.schema";

const TOKEN_PREFIX = "dvci_";
const MAX_EXPIRY_SECONDS = 31536000; // 1 year

@singleton()
export class CiTokenService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    body: CreateCiTokenBody,
    ipAddress: string,
  ): Promise<CiTokenCreatedResponse> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: body.environmentId, projectId },
    });
    if (!environment) {
      throw new NotFoundError("Environment not found in this project");
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

    const ciToken = await this.prisma.ciToken.create({
      data: {
        projectId,
        environmentId: body.environmentId,
        createdBy: userId,
        name: body.name,
        tokenHash,
        tokenPrefix,
        ipAllowlist,
        expiresAt,
      },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "CREATE",
      resourceType: "CI_TOKEN",
      resourceId: ciToken.id,
      ipAddress,
      metadata: { name: body.name, environmentId: body.environmentId },
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
          environment: {
            include: { vaultGroup: { select: { name: true } } },
          },
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
      environmentId: token.environmentId,
      environmentLabel: `${token.environment.vaultGroup.name} / ${token.environment.type}`,
      ipAllowlist: token.ipAllowlist,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      revokedAt: token.revokedAt,
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
    if (ciToken.revokedAt) {
      throw new BadRequestError("Token is already revoked");
    }

    await this.prisma.ciToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DELETE",
      resourceType: "CI_TOKEN",
      resourceId: tokenId,
      ipAddress,
      metadata: { name: ciToken.name },
    });

    return { message: "CI token revoked" };
  }

  async validateToken(rawToken: string, clientIp: string): Promise<CiToken> {
    const tokenHash = hashToken(rawToken);

    const ciToken = await this.prisma.ciToken.findUnique({
      where: { tokenHash },
    });

    if (!ciToken) {
      throw new UnauthorizedError("Invalid CI token");
    }
    if (ciToken.revokedAt) {
      throw new UnauthorizedError("CI token has been revoked");
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

  async fetchSecrets(
    ciToken: CiToken,
    rawToken: string,
    pipelineRunId: string | null,
    clientIp: string,
    baseUrl: string,
  ): Promise<CiSecretsResponse> {
    const projectKey = deriveProjectKey(ciToken.projectId);

    const [variables, files] = await Promise.all([
      this.prisma.envVariable.findMany({
        where: { environmentId: ciToken.environmentId },
      }),
      this.prisma.secretFile.findMany({
        where: { environmentId: ciToken.environmentId },
        select: { id: true, name: true, mimeType: true, fileSize: true },
      }),
    ]);

    const decryptedVariables = variables.map((v) => ({
      key: v.key,
      value: decrypt(v.encryptedValue, v.iv, v.authTag, projectKey),
    }));

    const fileList = files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      downloadUrl: `${baseUrl}/api/ci/secrets/files/${f.id}?token=${rawToken}`,
    }));

    await this.auditLogService.log({
      projectId: ciToken.projectId,
      action: "READ",
      resourceType: "CI_TOKEN",
      resourceId: ciToken.id,
      ipAddress: clientIp,
      metadata: {
        pipelineRunId: pipelineRunId ?? null,
        variableCount: decryptedVariables.length,
        fileCount: fileList.length,
      },
    });

    return { variables: decryptedVariables, files: fileList };
  }

  async downloadFile(
    ciToken: CiToken,
    fileId: string,
  ): Promise<{ buffer: Buffer; name: string; mimeType: string }> {
    const file = await this.prisma.secretFile.findFirst({
      where: { id: fileId, environmentId: ciToken.environmentId },
    });

    if (!file) {
      throw new NotFoundError("Secret file not found");
    }

    const projectKey = deriveProjectKey(ciToken.projectId);
    const buffer = decryptBinary(
      Buffer.from(file.encryptedContent),
      file.iv,
      file.authTag,
      projectKey,
    );

    return { buffer, name: file.name, mimeType: file.mimeType };
  }
}
