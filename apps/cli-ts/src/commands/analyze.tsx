import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ReactElement } from "react";
import { DEPENDENCY_FILE_MAP, type EcosystemValue } from "@depvault/shared";
import { Box, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { Success } from "@/ui/success";
import { Table } from "@/ui/table";
import { getFlag, getPositional } from "@/utils/args";

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
    .analyses.post({ fileName, content, ecosystem } as any);

  if (error || !data) {
    return <ErrorBox message="Analysis failed." />;
  }

  const analysis = data as any;

  return (
    <Box flexDirection="column" gap={1}>
      <Success message={`Analysis complete for ${fileName}`} />
      <KeyValue label="Ecosystem" value={analysis.ecosystem} />
      <KeyValue label="Dependencies" value={String(analysis.dependencyCount ?? 0)} />
      <KeyValue label="Vulnerabilities" value={String(analysis.vulnerabilityCount ?? 0)} />
      <KeyValue label="Health Score" value={`${analysis.healthScore ?? "N/A"}/100`} />

      {analysis.vulnerabilities?.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Vulnerabilities:</Text>
          <Table
            headers={["Package", "Severity", "ID"]}
            rows={analysis.vulnerabilities
              .slice(0, 20)
              .map((v: any) => [v.packageName ?? "", v.severity ?? "", v.osvId ?? v.id ?? ""])}
          />
        </Box>
      )}
    </Box>
  );
}
