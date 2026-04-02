import type { ReactElement } from "react";
import { decrypt } from "@depvault/crypto";
import { Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
import { ErrorBox } from "@/ui/error-box";
import { Table } from "@/ui/table";
import { getFlag } from "@/utils/args";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const config = loadConfig();
  const projectId = getFlag(args, "project") ?? config.activeProjectId;

  if (!projectId) {
    return <ErrorBox message="No active project." />;
  }

  const vaultGroupId = getFlag(args, "vault-group");
  const environmentType = getFlag(args, "environment");
  const outputFormat = getFlag(args, "output") ?? "table";

  // If no vault group specified, get the first one
  const client = getApiClient();
  let resolvedVaultGroupId = vaultGroupId;

  if (!resolvedVaultGroupId) {
    const { data: vaultGroups } = await client.api
      .projects({ id: projectId })
      ["vault-groups"].get();

    if (!vaultGroups || vaultGroups.length === 0) {
      return <ErrorBox message="No vault groups found." />;
    }

    resolvedVaultGroupId = vaultGroups[0]!.id;
  }

  const query: Record<string, any> = { vaultGroupId: resolvedVaultGroupId, page: 1, limit: 100 };
  if (environmentType) query.environmentType = environmentType;

  const { data, error } = await client.api
    .projects({ id: projectId })
    .environments.variables.get({ query } as any);

  if (error || !data) {
    return <ErrorBox message="Failed to list variables." />;
  }

  const variables = (data as any).data ?? [];

  if (variables.length === 0) {
    return <Text>No environment variables found.</Text>;
  }

  const dek = await resolveDek(projectId, null);

  const rows: string[][] = [];
  for (const v of variables) {
    const value = await decrypt(v.encryptedValue, v.iv, v.authTag, dek);
    const masked = value.length > 20 ? value.slice(0, 20) + "..." : value;
    rows.push([v.key, masked]);
  }

  if (outputFormat === "json") {
    const jsonRows = await Promise.all(
      variables.map(async (v: any) => ({
        key: v.key,
        value: await decrypt(v.encryptedValue, v.iv, v.authTag, dek),
      })),
    );
    return <Text>{JSON.stringify(jsonRows, null, 2)}</Text>;
  }

  return <Table headers={["Key", "Value"]} rows={rows} />;
}
