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
  const vaultGroupId = getFlag(args, "vault-group");
  const environments = getFlag(args, "environments");

  if (!projectId) {
    return <ErrorBox message="No active project." />;
  }

  if (!vaultGroupId || !environments) {
    return <ErrorBox message="Usage: /env diff --vault-group=<id> --environments=<env1,env2>" />;
  }

  const client = getApiClient();
  const { data, error } = await client.api.projects({ id: projectId }).environments.diff.get({
    query: { vaultGroupId, environments },
  } as any);

  if (error || !data) {
    return <ErrorBox message="Failed to get diff." />;
  }

  const diffData = data as any;
  const envIds: string[] = diffData.environments ?? [];
  const rows = diffData.rows ?? [];

  if (rows.length === 0) {
    return <Text>No differences found.</Text>;
  }

  const dek = await resolveDek(projectId, null);

  const headers = ["Key", "Status", ...envIds];
  const tableRows: string[][] = [];

  for (const row of rows) {
    const cells = [row.key, row.status];
    for (const envId of envIds) {
      const val = row.values?.[envId];
      if (val?.exists) {
        const decrypted = await decrypt(val.encryptedValue, val.iv, val.authTag, dek);
        cells.push(decrypted.length > 15 ? decrypted.slice(0, 15) + "..." : decrypted);
      } else {
        cells.push("—");
      }
    }
    tableRows.push(cells);
  }

  return <Table headers={headers} rows={tableRows} />;
}
