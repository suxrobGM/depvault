import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { decrypt, deriveProjectKey } from "@/common/utils/encryption";
import { PrismaClient } from "@/generated/prisma";
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
    environmentsCsv: string,
    userId: string,
    ipAddress: string,
  ): Promise<EnvDiffResponse> {
    const envNames = environmentsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (envNames.length < 2 || envNames.length > 3) {
      throw new BadRequestError("Provide 2 or 3 comma-separated environment names");
    }

    const member = await this.envHelper.requireMember(projectId, userId);
    const canReadValues = member.role === "OWNER" || member.role === "EDITOR";

    const environments = await this.prisma.environment.findMany({
      where: { projectId, vaultGroupId, name: { in: envNames } },
      include: { variables: true },
    });

    if (environments.length !== envNames.length) {
      const found = new Set(environments.map((e) => e.name));
      const missing = envNames.filter((n) => !found.has(n));
      throw new NotFoundError(`Environment(s) not found: ${missing.join(", ")}`);
    }

    const projectKey = canReadValues ? deriveProjectKey(projectId) : null;
    const rows = this.buildDiffRows(environments, envNames, projectKey, canReadValues);

    await this.auditLogService.log({
      userId,
      projectId,
      action: "READ",
      resourceType: "ENV_VARIABLE",
      resourceId: projectId,
      ipAddress,
      metadata: { type: "diff", environments: envNames.join(",") },
    });

    return { environments: envNames, rows };
  }

  private buildDiffRows(
    environments: {
      name: string;
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
    envNames: string[],
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
      envVarMaps.set(env.name, varMap);
    }

    const rows: EnvDiffRow[] = [];
    for (const [key, meta] of allKeys) {
      const values: Record<
        string,
        { value: string; exists: boolean; environmentId: string; updatedAt: Date } | null
      > = {};
      let allExist = true;
      const decryptedValues: string[] = [];

      for (const envName of envNames) {
        const varMap = envVarMaps.get(envName)!;
        const variable = varMap.get(key);
        if (variable) {
          const value = projectKey
            ? decrypt(variable.encryptedValue, variable.iv, variable.authTag, projectKey)
            : "********";
          decryptedValues.push(value);
          values[envName] = {
            value,
            exists: true,
            environmentId: variable.environmentId,
            updatedAt: variable.updatedAt,
          };
        } else {
          allExist = false;
          values[envName] = null;
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
