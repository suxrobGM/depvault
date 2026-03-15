import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const rustParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "cargo.toml";
  },

  parse(content: string, fileName: string): ParseResult {
    return parseCargoToml(content, fileName);
  },
};

function parseCargoToml(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const lines = content.split(/\r?\n/);
  let currentSection: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    // Track section headers
    if (line.startsWith("[")) {
      currentSection = line.replace(/^\[+\s*/, "").replace(/\s*\]+$/, "");
      continue;
    }

    if (!isDependencySection(currentSection)) continue;

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const name = kvMatch[1]!;
    const rawValue = kvMatch[2]!.trim();

    const version = extractVersion(rawValue);
    dependencies.push({ name, version: version || "*", isDirect: true });
  }

  return { dependencies, fileName };
}

function isDependencySection(section: string | null): boolean {
  if (!section) return false;
  return (
    section === "dependencies" ||
    section === "dev-dependencies" ||
    section === "build-dependencies" ||
    (section.startsWith("target.") && section.endsWith(".dependencies"))
  );
}

function extractVersion(value: string): string | null {
  // Simple string: "1.0.0"
  const quoted = value.match(/^"([^"]*)"$/);
  if (quoted) return quoted[1]!;

  // Inline table: { version = "1.0.0", features = [...] }
  const versionInTable = value.match(/version\s*=\s*"([^"]*)"/);
  if (versionInTable) return versionInTable[1]!;

  // Inline table without version (path/git dependency)
  if (value.startsWith("{")) return null;

  return null;
}
