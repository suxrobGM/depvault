import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey, encrypt } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
import type { EnvVariableVersionListResponse } from "./env-variable-version.schema";
import type { EnvVariableWithValueResponse } from "./env-variable.schema";
import { toDecryptedResponse } from "./environment.mapper";
import { EnvironmentRepository } from "./environment.repository";

@singleton()
export class EnvVariableVersionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** List version history for an environment variable. Editors/owners see decrypted values; viewers see masked values. */
  async listVersions(
    projectId: string,
    varId: string,
    userId: string,
  ): Promise<EnvVariableVersionListResponse> {
    const member = await this.envHelper.requireMember(projectId, userId);

    const variable = await this.prisma.envVariable.findFirst({
      where: { id: varId, environment: { projectId } },
    });

    if (!variable) {
      throw new NotFoundError("Environment variable not found");
    }

    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";
    const projectKey = canReadValues ? deriveProjectKey(projectId) : null;

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
      value: projectKey ? decrypt(v.encryptedValue, v.iv, v.authTag, projectKey) : "********",
      changedByName: userNameMap.get(v.changedBy) ?? "Unknown user",
      createdAt: v.createdAt,
    }));

    return { items };
  }

  /** Rollback a variable to a previous version. Saves the current value as a new version snapshot before restoring. */
  async rollback(
    projectId: string,
    varId: string,
    versionId: string,
    userId: string,
  ): Promise<EnvVariableWithValueResponse> {
    await this.envHelper.requireEditorOrOwner(projectId, userId);

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

    const projectKey = deriveProjectKey(projectId);
    const plaintext = decrypt(version.encryptedValue, version.iv, version.authTag, projectKey);

    // Re-encrypt with a fresh IV — GCM IVs must never be reused
    const { ciphertext, iv, authTag } = encrypt(plaintext, projectKey);

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

    const updated = await this.prisma.envVariable.update({
      where: { id: varId },
      data: { encryptedValue: ciphertext, iv, authTag },
    });

    return toDecryptedResponse(updated, projectKey);
  }
}
