import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { Text } from "ink";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { listSecretFiles } from "@/services/secrets-puller";
import { ErrorBox } from "@/ui/error-box";
import { Table } from "@/ui/table";
import { getFlag } from "@/utils/args";
import { renderResult } from "@/utils/render";

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

export class SecretsListCommand extends Command {
  static override paths = [["secrets", "list"]];
  static override usage = Command.Usage({ description: "List secret files" });

  project = Option.String("--project", { required: false });
  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.output) args.push(`--output=${this.output}`);
    await renderResult(this.context.stdout, handler, args);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
