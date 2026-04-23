import { singleton } from "tsyringe";
import { BadRequestError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { ProjectVaultRepository } from "@/modules/project-vault";
import type { EnvBundleBody, EnvBundleResponse } from "./env-bundle.schema";

@singleton()
export class EnvBundleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly vaultRepo: ProjectVaultRepository,
  ) {}

  /** Return encrypted variables and secret files for client-side bundling. */
  async createBundle(
    projectId: string,
    vaultId: string,
    body: EnvBundleBody,
    userId: string,
    ipAddress: string,
  ): Promise<EnvBundleResponse> {
    const vault = await this.vaultRepo.requireVault(projectId, vaultId);

    if (body.variableIds.length === 0 && body.secretFileIds.length === 0) {
      throw new BadRequestError("At least one variable or secret file must be selected");
    }

    let variables: { key: string; encryptedValue: string; iv: string; authTag: string }[] = [];
    let files: {
      id: string;
      name: string;
      encryptedContent: string;
      iv: string;
      authTag: string;
      mimeType: string;
    }[] = [];

    if (body.variableIds.length > 0) {
      const vars = await this.prisma.envVariable.findMany({
        where: { id: { in: body.variableIds }, vaultId: vault.id },
      });

      if (vars.length !== body.variableIds.length) {
        throw new BadRequestError("One or more variable IDs are invalid");
      }

      variables = vars.map((v) => ({
        key: v.key,
        encryptedValue: v.encryptedValue,
        iv: v.iv,
        authTag: v.authTag,
      }));
    }

    if (body.secretFileIds.length > 0) {
      const secretFiles = await this.prisma.secretFile.findMany({
        where: { id: { in: body.secretFileIds }, vaultId: vault.id },
      });

      if (secretFiles.length !== body.secretFileIds.length) {
        throw new BadRequestError("One or more secret file IDs are invalid");
      }

      files = secretFiles.map((f) => ({
        id: f.id,
        name: f.name,
        encryptedContent: Buffer.from(f.encryptedContent).toString("base64"),
        iv: f.iv,
        authTag: f.authTag,
        mimeType: f.mimeType,
      }));
    }

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "ENV_VARIABLE",
      resourceId: vault.id,
      ipAddress,
      metadata: {
        type: "bundle",
        variableCount: body.variableIds.length,
        fileCount: body.secretFileIds.length,
        vaultName: vault.name,
      },
    });

    return { variables, files };
  }
}
