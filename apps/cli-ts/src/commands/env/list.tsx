import type { ReactElement } from "react";
import { decrypt } from "@depvault/crypto";
import type { EnvironmentTypeValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
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

  const { data, error } = await client.api.projects({ id: projectId }).environments.variables.get({
    query: {
      vaultGroupId: resolvedVaultGroupId,
      page: 1,
      limit: 100,
      ...(environmentType ? { environmentType: environmentType as EnvironmentTypeValue } : {}),
    },
  });

  if (error || !data) {
    return <ErrorBox message="Failed to list variables." />;
  }

  const variables = data.items;

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
      variables.map(async (v) => ({
        key: v.key,
        value: await decrypt(v.encryptedValue, v.iv, v.authTag, dek),
      })),
    );
    return <Text>{JSON.stringify(jsonRows, null, 2)}</Text>;
  }

  return <Table headers={["Key", "Value"]} rows={rows} />;
}

export class EnvListCommand extends Command {
  static override paths = [["env", "list"]];
  static override usage = Command.Usage({ description: "List environment variables" });

  project = Option.String("--project", { required: false });
  vaultGroup = Option.String("--vault-group", { required: false });
  environment = Option.String("--environment", { required: false });
  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.vaultGroup) args.push(`--vault-group=${this.vaultGroup}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.output) args.push(`--output=${this.output}`);
    await renderResult(this.context.stdout, handler, args);
  }
}
