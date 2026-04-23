import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type { EnvVariableVersionListResponse } from "./env-variable-version.schema";
import { toEncryptedResponse } from "./env-variable.mapper";
import type { EnvVariableWithValueResponse } from "./env-variable.schema";

@singleton()
export class EnvVariableVersionService {
  constructor(private readonly prisma: PrismaClient) {}

  async listVersions(
    projectId: string,
    vaultId: string,
    varId: string,
  ): Promise<EnvVariableVersionListResponse> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, vaultId, vault: { projectId } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    const versions = await this.prisma.envVariableVersion.findMany({
      where: { variableId: varId },
      orderBy: { createdAt: "desc" },
    });

    if (versions.length === 0) {
      return { items: [] };
    }

    const changedByIds = [...new Set(versions.map((v) => v.changedBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: changedByIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userNameMap = new Map(
      users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email]),
    );

    const items = versions.map((v) => ({
      id: v.id,
      variableId: v.variableId,
      encryptedValue: v.encryptedValue,
      iv: v.iv,
      authTag: v.authTag,
      changedByName: userNameMap.get(v.changedBy) ?? "Unknown user",
      createdAt: v.createdAt,
    }));

    return { items };
  }

  /** Rollback restores the encrypted triple from a previous version (same DEK, same ciphertext). */
  async rollback(
    projectId: string,
    vaultId: string,
    varId: string,
    versionId: string,
    userId: string,
  ): Promise<EnvVariableWithValueResponse> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, vaultId, vault: { projectId } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    const version = await this.prisma.envVariableVersion.findFirst({
      where: { id: versionId, variableId: varId },
    });

    if (!version) {
      throw new NotFoundError("Version not found");
    }

    await this.prisma.envVariableVersion.create({
      data: {
        variableId: varId,
        encryptedValue: variable.encryptedValue,
        iv: variable.iv,
        authTag: variable.authTag,
        changedBy: userId,
      },
    });

    const updated = await this.prisma.envVariable.update({
      where: { id: varId },
      data: {
        encryptedValue: version.encryptedValue,
        iv: version.iv,
        authTag: version.authTag,
      },
    });

    return toEncryptedResponse(updated);
  }
}
