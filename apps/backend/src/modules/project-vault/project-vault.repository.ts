import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";

@singleton()
export class ProjectVaultRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Ensure the vault exists under the given project; returns it. */
  async requireVault(projectId: string, vaultId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, projectId },
    });

    if (!vault) {
      throw new NotFoundError("Vault not found");
    }

    return vault;
  }

  /** Look up a vault's display name by ID (returns "Unknown" if missing). */
  async getVaultName(vaultId: string): Promise<string> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: { name: true },
    });
    return vault?.name ?? "Unknown";
  }
}
