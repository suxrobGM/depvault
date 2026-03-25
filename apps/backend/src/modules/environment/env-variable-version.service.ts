import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import type { EnvVariableVersionListResponse } from "./env-variable-version.schema";
import type { EnvVariableWithValueResponse } from "./env-variable.schema";
import { toEncryptedResponse } from "./environment.mapper";

@singleton()
export class EnvVariableVersionService {
  constructor(private readonly prisma: PrismaClient) {}

  async listVersions(
    projectId: string,
    varId: string,
    _memberRole: string,
  ): Promise<EnvVariableVersionListResponse> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, environment: { projectId } },
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

  /** Rollback: restores encrypted value from a version. Client sends pre-encrypted data, but for rollback we use the version's encrypted triple directly. */
  async rollback(
    projectId: string,
    varId: string,
    versionId: string,
    userId: string,
  ): Promise<EnvVariableWithValueResponse> {
    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, environment: { projectId } },
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

    // Snapshot the current value before overwriting
    await this.prisma.envVariableVersion.create({
      data: {
        variableId: varId,
        encryptedValue: variable.encryptedValue,
        iv: variable.iv,
        authTag: variable.authTag,
        changedBy: userId,
      },
    });

    // Restore the version's encrypted triple directly (same DEK, same ciphertext)
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
