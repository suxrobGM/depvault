import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import type { ConfigFormat, EnvironmentTypeValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Box, Text } from "ink";
import { getCommandContext } from "@/app/command-context";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
import { pushEnvVars } from "@/services/env-importer";
import {
  detectEnvironmentType,
  detectFormat,
  findPushableFiles,
  type DiscoveredFile,
} from "@/services/file-scanner";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { colors } from "@/ui/theme";
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

  // Resolve file(s) to push
  const explicitFile = getFlag(args, "file") ?? getPositional(args);
  let filesToPush: DiscoveredFile[];

  if (explicitFile) {
    // Explicit file path — use as-is
    filesToPush = [
      {
        fullPath: explicitFile,
        relativePath: explicitFile,
        fileName: explicitFile.split("/").pop() ?? explicitFile,
        category: "environment",
      },
    ];
  } else {
    // Interactive: scan for pushable files and let user select
    const ctx = getCommandContext();
    if (!ctx) {
      return <ErrorBox message="Usage: /push <file> [--environment=...] [--format=...]" />;
    }

    const discovered = findPushableFiles(process.cwd());
    if (discovered.length === 0) {
      return <ErrorBox message="No env files or secret files found in the current directory." />;
    }

    const options = discovered.map((f) => {
      const env = detectEnvironmentType(f.fileName);
      const tag = f.category === "secret" ? "[secret]" : env ? `[${env}]` : "[env]";
      return { label: `${f.relativePath} ${tag}`, value: f.relativePath };
    });

    const selected = await ctx.requestSelect(options);
    const match = discovered.find((f) => f.relativePath === selected);
    if (!match) {
      return <ErrorBox message="No file selected." />;
    }

    filesToPush = [match];
  }

  // Resolve vault groups
  const client = getApiClient();
  const { data: vaultGroups, error: vgError } = await client.api
    .projects({ id: projectId })
    ["vault-groups"].get();

  if (vgError || !vaultGroups) {
    const msg = (vgError?.value as { message?: string })?.message ?? "Failed to load vault groups.";
    return <ErrorBox message={msg} />;
  }

  if (vaultGroups.length === 0) {
    return <ErrorBox message="No vault groups found for this project." />;
  }

  const vaultGroupId = vaultGroups[0]!.id;
  const ctx = getCommandContext();
  const dek = await resolveDek(projectId, ctx?.kek ?? null);

  const results: ReactElement[] = [];

  for (const file of filesToPush) {
    const environmentType =
      (getFlag(args, "environment") as EnvironmentTypeValue) ??
      (detectEnvironmentType(file.fileName) as EnvironmentTypeValue) ??
      "DEVELOPMENT";
    const format = (getFlag(args, "format") ?? detectFormat(file.fileName)) as ConfigFormat;

    let content: string;
    try {
      content = readFileSync(file.fullPath, "utf-8");
    } catch {
      results.push(
        <ErrorBox
          key={`err-${file.relativePath}`}
          message={`Cannot read file: ${file.relativePath}`}
        />,
      );
      continue;
    }

    try {
      const { imported, updated } = await pushEnvVars({
        projectId,
        vaultGroupId,
        environmentType,
        dek,
        content,
        format,
      });

      results.push(
        <Box key={`ok-${file.relativePath}`} flexDirection="column">
          <Success message={`Pushed ${file.relativePath} → ${environmentType}`} />
          <Text color={colors.muted}>
            {" "}
            {imported} imported, {updated} updated
          </Text>
        </Box>,
      );
    } catch (err) {
      results.push(
        <ErrorBox
          key={`push-err-${file.relativePath}`}
          message={`Failed to push ${file.relativePath}: ${err instanceof Error ? err.message : "Unknown error"}`}
        />,
      );
    }
  }

  return <Box flexDirection="column">{results}</Box>;
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
