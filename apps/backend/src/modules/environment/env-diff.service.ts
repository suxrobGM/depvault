import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey } from "@/common/utils/encryption";
import { EnvironmentType, PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import { EnvironmentRepository } from "./environment.repository";
import type { EnvDiffResponse, EnvDiffRow } from "./environment.schema";

@singleton()
export class EnvironmentDiffService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly envHelper: EnvironmentRepository,
  ) {}

  /** Compare variables across 2-3 environments, highlighting missing and differing values. */
  async diff(
    projectId: string,
    vaultGroupId: string,
    environmentTypesCsv: string,
    userId: string,
    ipAddress: string,
  ): Promise<EnvDiffResponse> {
    const envTypes = environmentTypesCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as EnvironmentType[];

    if (envTypes.length < 2 || envTypes.length > 3) {
      throw new BadRequestError("Provide 2 or 3 comma-separated environment types");
    }

    const member = await this.envHelper.requireMember(projectId, userId);
    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";
    const groupName = await this.envHelper.getVaultGroupName(vaultGroupId);

    const environments = await this.prisma.environment.findMany({
      where: { projectId, vaultGroupId, type: { in: envTypes } },
      include: { variables: true },
    });

    if (environments.length !== envTypes.length) {
      const found = new Set(environments.map((e) => e.type));
      const missing = envTypes.filter((t) => !found.has(t));
      throw new NotFoundError(`Environment(s) not found: ${missing.join(", ")}`);
    }

    const projectKey = canReadValues ? deriveProjectKey(projectId) : null;
    const rows = this.buildDiffRows(environments, envTypes, projectKey, canReadValues);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "READ",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { type: "diff", environments: envTypes.join(","), vaultGroupName: groupName },
    });

    return { environments: envTypes, rows };
  }

  private buildDiffRows(
    environments: {
      type: EnvironmentType;
      variables: {
        key: string;
        description: string | null;
        isRequired: boolean;
        encryptedValue: string;
        iv: string;
        authTag: string;
        environmentId: string;
        updatedAt: Date;
      }[];
    }[],
    envTypes: EnvironmentType[],
    projectKey: Buffer | null,
    canReadValues: boolean,
  ): EnvDiffRow[] {
    const allKeys = new Map<string, { description: string | null; isRequired: boolean }>();
    const envVarMaps = new Map<string, Map<string, (typeof environments)[0]["variables"][0]>>();

    for (const env of environments) {
      const varMap = new Map<string, (typeof env.variables)[0]>();
      for (const v of env.variables) {
        varMap.set(v.key, v);
        if (!allKeys.has(v.key)) {
          allKeys.set(v.key, { description: v.description, isRequired: v.isRequired });
        }
      }
      envVarMaps.set(env.type, varMap);
    }

    const rows: EnvDiffRow[] = [];
    for (const [key, meta] of allKeys) {
      const values: Record<
        string,
        { value: string; exists: boolean; environmentId: string; updatedAt: Date } | null
      > = {};
      let allExist = true;
      const decryptedValues: string[] = [];

      for (const envType of envTypes) {
        const varMap = envVarMaps.get(envType)!;
        const variable = varMap.get(key);
        if (variable) {
          const value = projectKey
            ? decrypt(variable.encryptedValue, variable.iv, variable.authTag, projectKey)
            : "********";
          decryptedValues.push(value);
          values[envType] = {
            value,
            exists: true,
            environmentId: variable.environmentId,
            updatedAt: variable.updatedAt,
          };
        } else {
          allExist = false;
          values[envType] = null;
        }
      }

      let status: "match" | "mismatch" | "missing";
      if (!allExist) {
        status = "missing";
      } else if (canReadValues && new Set(decryptedValues).size > 1) {
        status = "mismatch";
      } else {
        status = "match";
      }

      rows.push({
        key,
        description: meta.description,
        isRequired: meta.isRequired,
        status,
        values,
      });
    }

    const statusOrder = { missing: 0, mismatch: 1, match: 2 };
    rows.sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status] || a.key.localeCompare(b.key),
    );

    return rows;
  }
}
