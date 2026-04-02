import type { ReactElement } from "react";
import { Text } from "ink";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { listSecretFiles } from "@/services/secrets-puller";
import { ErrorBox } from "@/ui/error-box";
import { Table } from "@/ui/table";
import { getFlag } from "@/utils/args";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const config = loadConfig();
  const projectId = getFlag(args, "project") ?? config.activeProjectId;
  const outputFormat = getFlag(args, "output") ?? "table";

  if (!projectId) {
    return <ErrorBox message="No active project." />;
  }

  const secrets = await listSecretFiles(projectId);

  if (secrets.length === 0) {
    return <Text>No secret files found.</Text>;
  }

  if (outputFormat === "json") {
    return <Text>{JSON.stringify(secrets, null, 2)}</Text>;
  }

  return (
    <Table
      headers={["Name", "Vault Group", "Size", "Type", "Created"]}
      rows={secrets.map((s) => [
        s.name,
        s.vaultGroupName,
        formatBytes(s.fileSize),
        s.mimeType,
        new Date(s.createdAt).toLocaleDateString(),
      ])}
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
