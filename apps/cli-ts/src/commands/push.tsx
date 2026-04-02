import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import type { ConfigFormat } from "@depvault/shared";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
import { pushEnvVars } from "@/services/env-importer";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { getFlag, getPositional } from "@/utils/args";

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
      environmentType: environmentType as any,
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
