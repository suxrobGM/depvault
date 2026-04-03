import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import type { ConfigFormat, EnvironmentTypeValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
import { pushEnvVars } from "@/services/env-importer";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { getFlag, getPositional } from "@/utils/args";
import { renderResult } from "@/utils/render";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const config = loadConfig();
  const projectId = getFlag(args, "project") ?? config.activeProjectId;

  if (!projectId) {
    return <ErrorBox message="No active project. Use /project select or --project=<id>." />;
  }

  const filePath = getFlag(args, "file") ?? getPositional(args);
  if (!filePath) {
    return <ErrorBox message="Usage: /push --file=<path> [--environment=...] [--format=...]" />;
  }

  const environmentType = getFlag(args, "environment") ?? "DEVELOPMENT";
  const format = (getFlag(args, "format") ?? "env") as ConfigFormat;

  // Get first vault group
  const client = getApiClient();
  const { data: vaultGroups, error: vgError } = await client.api
    .projects({ id: projectId })
    ["vault-groups"].get();

  if (vgError || !vaultGroups || vaultGroups.length === 0) {
    return <ErrorBox message="No vault groups found for this project." />;
  }

  const vaultGroupId = vaultGroups[0]!.id;
  const dek = await resolveDek(projectId, null);

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return <ErrorBox message={`Cannot read file: ${filePath}`} />;
  }

  try {
    const { imported, updated } = await pushEnvVars({
      projectId,
      vaultGroupId,
      environmentType: environmentType as EnvironmentTypeValue,
      dek,
      content,
      format,
    });

    return (
      <Box flexDirection="column">
        <Success message={`Pushed ${filePath} to ${environmentType}`} />
        <Success message={`${imported} imported, ${updated} updated`} />
      </Box>
    );
  } catch (err) {
    return <ErrorBox message={err instanceof Error ? err.message : "Push failed."} />;
  }
}

export class PushCommand extends Command {
  static override paths = [["push"]];
  static override usage = Command.Usage({ description: "Push env vars + secret files" });

  file = Option.String("--file", { required: false });
  project = Option.String("--project", { required: false });
  environment = Option.String("--environment", { required: false });
  format = Option.String("--format", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.file) args.push(`--file=${this.file}`);
    if (this.project) args.push(`--project=${this.project}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.format) args.push(`--format=${this.format}`);
    await renderResult(this.context.stdout, handler, args);
  }
}
