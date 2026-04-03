import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import type { ConfigFormat, EnvironmentTypeValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { resolveDek } from "@/services/dek-resolver";
import { pullEnvVars } from "@/services/env-puller";
import { listSecretFiles, pullSecretFile } from "@/services/secrets-puller";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { getFlag, hasFlag } from "@/utils/args";
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

  const environmentType = getFlag(args, "environment") ?? "DEVELOPMENT";
  const format = (getFlag(args, "format") ?? "env") as ConfigFormat;
  const outputDir = getFlag(args, "output-dir") ?? ".";
  const includeSecrets = !hasFlag(args, "no-secrets");

  // Resolve vault groups
  const client = getApiClient();
  const { data: vaultGroups, error: vgError } = await client.api
    .projects({ id: projectId })
    ["vault-groups"].get();

  if (vgError || !vaultGroups || vaultGroups.length === 0) {
    return <ErrorBox message="No vault groups found for this project." />;
  }

  // Resolve DEK (uses cached KEK from REPL VaultContext, or env var in one-shot)
  // In REPL mode, the __kek will be passed via the global; for now use null to trigger env var path
  const dek = await resolveDek(projectId, null);

  const results: ReactElement[] = [];

  for (const vg of vaultGroups) {
    const vaultGroupId = vg.id;
    const dirPath = vg.directoryPath ?? outputDir;
    mkdirSync(dirPath, { recursive: true });

    try {
      const { serialized, count } = await pullEnvVars({
        projectId,
        vaultGroupId,
        environmentType: environmentType as EnvironmentTypeValue,
        dek,
        format,
      });

      const fileName = format === "env" ? ".env" : format;
      const filePath = join(dirPath, fileName);
      writeFileSync(filePath, serialized);
      results.push(
        <Success key={`env-${vg.id}`} message={`Wrote ${filePath} (${count} variables)`} />,
      );
    } catch {
      results.push(
        <ErrorBox
          key={`env-err-${vg.id}`}
          message={`Failed to pull env vars for vault group "${vg.name}".`}
        />,
      );
    }

    if (includeSecrets) {
      try {
        const secrets = await listSecretFiles(projectId);
        for (const secret of secrets) {
          if (secret.vaultGroupName === vg.name) {
            const { name, content } = await pullSecretFile(projectId, secret.id, dek);
            const secretPath = join(dirPath, name);
            writeFileSync(secretPath, Buffer.from(content));
            results.push(<Success key={`secret-${secret.id}`} message={`Wrote ${secretPath}`} />);
          }
        }
      } catch {
        results.push(
          <ErrorBox
            key={`secret-err-${vg.id}`}
            message={`Failed to pull secrets for vault group "${vg.name}".`}
          />,
        );
      }
    }
  }

  return <Box flexDirection="column">{results}</Box>;
}

export class PullCommand extends Command {
  static override paths = [["pull"]];
  static override usage = Command.Usage({ description: "Pull env vars + secret files" });

  project = Option.String("--project", { required: false });
  environment = Option.String("--environment", { required: false });
  format = Option.String("--format", { required: false });
  outputDir = Option.String("--output-dir", { required: false });
  noSecrets = Option.Boolean("--no-secrets", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.format) args.push(`--format=${this.format}`);
    if (this.outputDir) args.push(`--output-dir=${this.outputDir}`);
    if (this.noSecrets) args.push("--no-secrets");
    await renderResult(this.context.stdout, handler, args);
  }
}
