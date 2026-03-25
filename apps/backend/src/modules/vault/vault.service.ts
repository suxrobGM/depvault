import { singleton } from "tsyringe";
import { ConflictError, NotFoundError } from "@/common/errors";
import { KeyGrantType, PrismaClient } from "@/generated/prisma";
import type {
  ChangeVaultPasswordBody,
  RecoverVaultBody,
  RegenerateRecoveryKeyBody,
  SetupVaultBody,
} from "./vault.schema";

@singleton()
export class VaultService {
  constructor(private readonly prisma: PrismaClient) {}

  async getStatus(userId: string) {
    const vault = await this.prisma.userVault.findUnique({
      where: { userId },
      select: {
        kekSalt: true,
        kekIterations: true,
        publicKey: true,
        wrappedPrivateKey: true,
        wrappedPrivateKeyIv: true,
        wrappedPrivateKeyTag: true,
        recoveryKeyHash: true,
        wrappedRecoveryKey: true,
        wrappedRecoveryKeyIv: true,
        wrappedRecoveryKeyTag: true,
      },
    });

    if (!vault) {
      return {
        hasVault: false,
        kekSalt: null,
        kekIterations: null,
        publicKey: null,
        wrappedPrivateKey: null,
        wrappedPrivateKeyIv: null,
        wrappedPrivateKeyTag: null,
        recoveryKeyHash: null,
        wrappedRecoveryKey: null,
        wrappedRecoveryKeyIv: null,
        wrappedRecoveryKeyTag: null,
      };
    }

    return {
      hasVault: true,
      kekSalt: vault.kekSalt,
      kekIterations: vault.kekIterations,
      publicKey: vault.publicKey,
      wrappedPrivateKey: vault.wrappedPrivateKey,
      wrappedPrivateKeyIv: vault.wrappedPrivateKeyIv,
      wrappedPrivateKeyTag: vault.wrappedPrivateKeyTag,
      recoveryKeyHash: vault.recoveryKeyHash,
      wrappedRecoveryKey: vault.wrappedRecoveryKey,
      wrappedRecoveryKeyIv: vault.wrappedRecoveryKeyIv,
      wrappedRecoveryKeyTag: vault.wrappedRecoveryKeyTag,
    };
  }

  async setup(userId: string, body: SetupVaultBody) {
    const existing = await this.prisma.userVault.findUnique({ where: { userId } });

    if (existing) {
      throw new ConflictError("Vault is already set up");
    }

    await this.prisma.userVault.create({
      data: {
        userId,
        kekSalt: body.kekSalt,
        kekIterations: body.kekIterations,
        publicKey: body.publicKey,
        wrappedPrivateKey: body.wrappedPrivateKey,
        wrappedPrivateKeyIv: body.wrappedPrivateKeyIv,
        wrappedPrivateKeyTag: body.wrappedPrivateKeyTag,
        recoveryKeyHash: body.recoveryKeyHash,
        wrappedRecoveryKey: body.wrappedRecoveryKey,
        wrappedRecoveryKeyIv: body.wrappedRecoveryKeyIv,
        wrappedRecoveryKeyTag: body.wrappedRecoveryKeyTag,
      },
    });

    return { message: "Vault set up successfully" };
  }

  async changePassword(userId: string, body: ChangeVaultPasswordBody) {
    const vault = await this.prisma.userVault.findUnique({ where: { userId } });

    if (!vault) {
      throw new NotFoundError("Vault not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userVault.update({
        where: { userId },
        data: {
          kekSalt: body.newKekSalt,
          kekIterations: body.newKekIterations,
          wrappedPrivateKey: body.newWrappedPrivateKey,
          wrappedPrivateKeyIv: body.newWrappedPrivateKeyIv,
          wrappedPrivateKeyTag: body.newWrappedPrivateKeyTag,
          wrappedRecoveryKey: body.newWrappedRecoveryKey,
          wrappedRecoveryKeyIv: body.newWrappedRecoveryKeyIv,
          wrappedRecoveryKeyTag: body.newWrappedRecoveryKeyTag,
        },
      });

      for (const grant of body.updatedGrants) {
        await tx.projectKeyGrant.updateMany({
          where: { projectId: grant.projectId, userId, grantType: KeyGrantType.SELF },
          data: {
            wrappedDek: grant.wrappedDek,
            wrappedDekIv: grant.wrappedDekIv,
            wrappedDekTag: grant.wrappedDekTag,
          },
        });
      }
    });

    return { message: "Vault password changed successfully" };
  }

  async recover(userId: string, body: RecoverVaultBody) {
    const vault = await this.prisma.userVault.findUnique({ where: { userId } });

    if (!vault) {
      throw new NotFoundError("Vault not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userVault.update({
        where: { userId },
        data: {
          kekSalt: body.newKekSalt,
          kekIterations: body.newKekIterations,
          publicKey: body.newPublicKey,
          wrappedPrivateKey: body.newWrappedPrivateKey,
          wrappedPrivateKeyIv: body.newWrappedPrivateKeyIv,
          wrappedPrivateKeyTag: body.newWrappedPrivateKeyTag,
          recoveryKeyHash: body.newRecoveryKeyHash,
          wrappedRecoveryKey: body.newWrappedRecoveryKey,
          wrappedRecoveryKeyIv: body.newWrappedRecoveryKeyIv,
          wrappedRecoveryKeyTag: body.newWrappedRecoveryKeyTag,
        },
      });

      for (const grant of body.updatedGrants) {
        await tx.projectKeyGrant.updateMany({
          where: { projectId: grant.projectId, userId, grantType: grant.grantType as KeyGrantType },
          data: {
            wrappedDek: grant.wrappedDek,
            wrappedDekIv: grant.wrappedDekIv,
            wrappedDekTag: grant.wrappedDekTag,
          },
        });
      }
    });

    return { message: "Vault recovered successfully" };
  }

  async regenerateRecoveryKey(userId: string, body: RegenerateRecoveryKeyBody) {
    const vault = await this.prisma.userVault.findUnique({ where: { userId } });

    if (!vault) {
      throw new NotFoundError("Vault not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userVault.update({
        where: { userId },
        data: {
          recoveryKeyHash: body.newRecoveryKeyHash,
          wrappedRecoveryKey: body.newWrappedRecoveryKey,
          wrappedRecoveryKeyIv: body.newWrappedRecoveryKeyIv,
          wrappedRecoveryKeyTag: body.newWrappedRecoveryKeyTag,
        },
      });

      for (const grant of body.updatedGrants) {
        await tx.projectKeyGrant.updateMany({
          where: { projectId: grant.projectId, userId, grantType: KeyGrantType.RECOVERY },
          data: {
            wrappedDek: grant.wrappedDek,
            wrappedDekIv: grant.wrappedDekIv,
            wrappedDekTag: grant.wrappedDekTag,
          },
        });
      }
    });

    return { message: "Recovery key regenerated successfully" };
  }

  async getPublicKey(targetUserId: string) {
    const vault = await this.prisma.userVault.findUnique({
      where: { userId: targetUserId },
      select: { publicKey: true },
    });

    return {
      userId: targetUserId,
      publicKey: vault?.publicKey ?? "",
      hasVault: !!vault,
    };
  }
}
