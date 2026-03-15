import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

const SUPPORTED_FILES = ["requirements.txt", "pyproject.toml"];

export const pythonParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return SUPPORTED_FILES.includes(fileName.toLowerCase());
  },

  parse(content: string, fileName: string): ParseResult {
    const lower = fileName.toLowerCase();

    if (lower === "requirements.txt") {
      return parseRequirementsTxt(content, fileName);
    }

    if (lower === "pyproject.toml") {
      return parsePyprojectToml(content, fileName);
    }

    throw new BadRequestError(`Unsupported Python file: ${fileName}`);
  },
};

function parseRequirementsTxt(content: string, fileName: string): ParseResult {
  const dependencies: ParsedDependency[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    // Skip -r, -c, -e, -f, --index-url, --extra-index-url, --find-links, etc.
    if (line.startsWith("-") || line.startsWith("--")) continue;

    // Skip URLs and file paths
    if (line.includes("://") || line.startsWith(".") || line.startsWith("/")) continue;

    // Strip inline comments
    const withoutComment = line.split("#")[0]!.trim();
    const parsed = parsePythonDependency(withoutComment);
    if (parsed) {
      dependencies.push(parsed);
    }
  }

  return { dependencies, fileName };
}

function parsePyprojectToml(content: string, fileName: string): ParseResult {
  const dependencies: ParsedDependency[] = [];

  const depsArray = extractTomlArray(content, "project", "dependencies");
  for (const dep of depsArray) {
    const parsed = parsePythonDependency(dep);
    if (parsed) {
      dependencies.push(parsed);
    }
  }

  return { dependencies, fileName };
}

const DEPENDENCY_REGEX = /^([a-zA-Z0-9_][a-zA-Z0-9._-]*(?:\[[^\]]*\])?)\s*((?:[=!<>~]=?|===?).+)?$/;

/** Parses a single Python dependency specifier (PEP 508 / PEP 621). */
function parsePythonDependency(raw: string): ParsedDependency | null {
  // Strip environment markers
  const withoutMarker = raw.split(";")[0]!.trim();
  if (!withoutMarker) return null;

  const match = withoutMarker.match(DEPENDENCY_REGEX);
  if (!match) return null;

  let name = match[1]!;
  const versionSpec = match[2]?.trim() || "*";

  // Strip extras bracket from name (e.g., "package[extra]" -> "package")
  const bracketIndex = name.indexOf("[");
  if (bracketIndex !== -1) {
    name = name.substring(0, bracketIndex);
  }

  // Normalize: underscores/dots to hyphens, lowercase
  name = name.replace(/[-_.]+/g, "-").toLowerCase();

  return { name, version: versionSpec, isDirect: true };
}

function extractTomlArray(content: string, table: string, key: string): string[] {
  const lines = content.split(/\r?\n/);
  let inTable = false;
  let foundKey = false;
  const result: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Track table headers
    if (line.startsWith("[")) {
      const tableName = line.replace(/^\[+\s*/, "").replace(/\s*\]+$/, "");
      inTable = tableName === table;
      if (!inTable && foundKey) break;
      continue;
    }

    if (!inTable) continue;

    if (!foundKey) {
      const keyMatch = line.match(new RegExp(`^${key}\\s*=\\s*(.*)$`));
      if (!keyMatch) continue;

      foundKey = true;
      const rest = keyMatch[1]!.trim();

      if (rest.startsWith("[")) {
        const inlineContent = rest.substring(1);
        collectArrayItems(inlineContent, result);
        if (isArrayClosing(inlineContent)) break;
      }
      continue;
    }

    // We're collecting a multiline array
    collectArrayItems(line, result);
    if (isArrayClosing(line)) break;
  }

  return result;
}

function isArrayClosing(line: string): boolean {
  let inDouble = false;
  let inSingle = false;
  for (const ch of line) {
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === "]" && !inDouble && !inSingle) return true;
  }
  return false;
}

function collectArrayItems(text: string, result: string[]): void {
  const matches = text.matchAll(/"([^"]*?)"|'([^']*?)'/g);
  for (const match of matches) {
    const value = match[1] ?? match[2];
    if (value) {
      result.push(value);
    }
  }
}
