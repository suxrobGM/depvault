import { readFileSync } from "node:fs";
import { basename, relative } from "node:path";
import type { ReactElement } from "react";
import { DEPENDENCY_FILE_MAP, type EcosystemValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Box, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { findDependencyFiles, findEnvFiles, findSecretFiles } from "@/services/file-scanner";
import { scanDirectory } from "@/services/secret-detector";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { Success } from "@/ui/success";
import { Table } from "@/ui/table";
import { colors } from "@/ui/theme";
import { getFlag } from "@/utils/args";
import { renderResult } from "@/utils/render";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  const config = loadConfig();
  const projectId = getFlag(args, "project") ?? config.activeProjectId;
  const scanPath = getFlag(args, "path") ?? process.cwd();

  if (!projectId) {
    return <ErrorBox message="No active project. Use /project select or --project=<id>." />;
  }

  const results: ReactElement[] = [];

  // Step 1: Dependency Analysis
  results.push(
    <Text key="dep-header" color={colors.highlight} bold>
      Scanning for dependency files...
    </Text>,
  );

  const depFiles = findDependencyFiles(scanPath);
  if (depFiles.length > 0) {
    const client = getApiClient();
    let analyzed = 0;

    for (const filePath of depFiles) {
      const fileName = basename(filePath);
      const ecosystem = DEPENDENCY_FILE_MAP[fileName];
      if (!ecosystem) {
        continue;
      }

      try {
        const content = readFileSync(filePath, "utf-8");
        await client.api
          .projects({ id: projectId })
          .analyses.post({ fileName, content, ecosystem });
        analyzed++;

        results.push(
          <Success key={`dep-${filePath}`} message={`Analyzed ${relative(scanPath, filePath)}`} />,
        );
      } catch {
        results.push(
          <Text key={`dep-err-${filePath}`} color={colors.warning}>
            Skipped {relative(scanPath, filePath)}
          </Text>,
        );
      }
    }

    results.push(
      <KeyValue key="dep-count" label="Dependencies analyzed" value={`${analyzed} file(s)`} />,
    );
  } else {
    results.push(
      <Text key="dep-none" color={colors.muted}>
        No dependency files found.
      </Text>,
    );
  }

  // Step 2: Environment Files
  results.push(
    <Text key="env-header" color={colors.highlight} bold>
      {"\n"}Scanning for environment files...
    </Text>,
  );

  const envFiles = findEnvFiles(scanPath);
  if (envFiles.length > 0) {
    results.push(
      <Table
        key="env-table"
        headers={["File", "Path"]}
        rows={envFiles.map((f) => [basename(f), relative(scanPath, f)])}
      />,
    );
    results.push(
      <KeyValue key="env-count" label="Env files found" value={String(envFiles.length)} />,
    );
  } else {
    results.push(
      <Text key="env-none" color={colors.muted}>
        No environment files found.
      </Text>,
    );
  }

  // Step 3: Secret Leak Detection
  results.push(
    <Text key="leak-header" color={colors.highlight} bold>
      {"\n"}Scanning for leaked secrets...
    </Text>,
  );

  const detections = scanDirectory(scanPath);
  if (detections.length > 0) {
    const rows = detections
      .slice(0, 50)
      .map((d) => [
        relative(scanPath, d.filePath),
        String(d.line),
        d.patternName,
        d.severity,
        d.snippet.slice(0, 40),
      ]);

    results.push(
      <Table
        key="leak-table"
        headers={["File", "Line", "Type", "Severity", "Match"]}
        rows={rows}
      />,
    );

    if (detections.length > 50) {
      results.push(
        <Text key="leak-more" color={colors.warning}>
          ... and {detections.length - 50} more detections
        </Text>,
      );
    }
  } else {
    results.push(<Success key="leak-none" message="No leaked secrets detected." />);
  }

  // Step 4: Secret Files
  results.push(
    <Text key="secret-header" color={colors.highlight} bold>
      {"\n"}Scanning for secret files...
    </Text>,
  );

  const secretFiles = findSecretFiles(scanPath);
  if (secretFiles.length > 0) {
    results.push(
      <Table
        key="secret-table"
        headers={["File", "Path"]}
        rows={secretFiles.map((f) => [basename(f), relative(scanPath, f)])}
      />,
    );
    results.push(
      <KeyValue key="secret-count" label="Secret files found" value={String(secretFiles.length)} />,
    );
  } else {
    results.push(
      <Text key="secret-none" color={colors.muted}>
        No secret files found.
      </Text>,
    );
  }

  // Summary
  results.push(
    <Box key="summary" flexDirection="column" marginTop={1}>
      <Text color={colors.highlight} bold>
        Scan Summary
      </Text>
      <KeyValue label="Dependency files" value={String(depFiles.length)} />
      <KeyValue label="Environment files" value={String(envFiles.length)} />
      <KeyValue label="Secret detections" value={String(detections.length)} />
      <KeyValue label="Secret files" value={String(secretFiles.length)} />
    </Box>,
  );

  return <Box flexDirection="column">{results}</Box>;
}

export class ScanCommand extends Command {
  static override paths = [["scan"]];
  static override usage = Command.Usage({
    description: "Scan repository for dependencies, env files, and secrets",
  });

  scanPath = Option.String("--path", { required: false });
  project = Option.String("--project", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.scanPath) args.push(`--path=${this.scanPath}`);
    if (this.project) args.push(`--project=${this.project}`);
    await renderResult(this.context.stdout, handler, args);
  }
}
