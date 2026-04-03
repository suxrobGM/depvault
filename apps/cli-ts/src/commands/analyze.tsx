import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ReactElement } from "react";
import { DEPENDENCY_FILE_MAP, type EcosystemValue } from "@depvault/shared";
import { Command, Option } from "clipanion";
import { Box, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { Success } from "@/ui/success";
import { Table } from "@/ui/table";
import { getFlag, getPositional } from "@/utils/args";
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

  const filePath = getFlag(args, "file") ?? getPositional(args);
  if (!filePath) {
    return <ErrorBox message="Usage: /analyze <file> [--ecosystem=...] [--project=...]" />;
  }

  const fileName = basename(filePath);
  const ecosystem =
    (getFlag(args, "ecosystem") as EcosystemValue | undefined) ??
    (DEPENDENCY_FILE_MAP as Record<string, EcosystemValue>)[fileName];

  if (!ecosystem) {
    return (
      <ErrorBox
        message={`Cannot detect ecosystem for "${fileName}". Use --ecosystem=NODEJS|PYTHON|DOTNET|...`}
      />
    );
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return <ErrorBox message={`Cannot read file: ${filePath}`} />;
  }

  const client = getApiClient();
  const { data, error } = await client.api
    .projects({ id: projectId })
    .analyses.post({ fileName, content, ecosystem });

  if (error || !data) {
    return <ErrorBox message="Analysis failed." />;
  }

  const analysis = data;
  const allVulnerabilities = analysis.dependencies.flatMap((dep) =>
    dep.vulnerabilities.map((v) => ({ ...v, packageName: dep.name })),
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Success message={`Analysis complete for ${fileName}`} />
      <KeyValue label="Ecosystem" value={analysis.ecosystem} />
      <KeyValue label="Dependencies" value={String(analysis.dependencies.length)} />
      <KeyValue label="Vulnerabilities" value={String(allVulnerabilities.length)} />
      <KeyValue label="Health Score" value={`${analysis.healthScore ?? "N/A"}/100`} />

      {allVulnerabilities.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Vulnerabilities:</Text>
          <Table
            headers={["Package", "Severity", "ID"]}
            rows={allVulnerabilities
              .slice(0, 20)
              .map((v) => [v.packageName, v.severity ?? "", v.cveId ?? v.id])}
          />
        </Box>
      )}
    </Box>
  );
}

export class AnalyzeCommand extends Command {
  static override paths = [["analyze"]];
  static override usage = Command.Usage({ description: "Analyze a dependency file" });

  file = Option.String("--file", { required: false });
  project = Option.String("--project", { required: false });
  ecosystem = Option.String("--ecosystem", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.file) args.push(this.file);
    if (this.project) args.push(`--project=${this.project}`);
    if (this.ecosystem) args.push(`--ecosystem=${this.ecosystem}`);
    await renderResult(this.context.stdout, handler, args);
  }
}
