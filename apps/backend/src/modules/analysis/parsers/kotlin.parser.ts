import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const kotlinParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "libs.versions.toml";
  },

  parse(content: string, fileName: string): ParseResult {
    return parseVersionCatalog(content, fileName);
  },
};

interface VersionCatalog {
  versions: Map<string, string>;
  libraries: ParsedDependency[];
  plugins: ParsedDependency[];
}

function parseVersionCatalog(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const catalog = parseCatalogSections(content);
  const dependencies = [...catalog.libraries, ...catalog.plugins];

  return { dependencies, fileName };
}

function parseCatalogSections(content: string): VersionCatalog {
  const lines = content.split(/\r?\n/);
  const versions = new Map<string, string>();
  const libraries: ParsedDependency[] = [];
  const plugins: ParsedDependency[] = [];

  let currentSection: "versions" | "libraries" | "plugins" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    // Section headers
    if (line.startsWith("[")) {
      const section = line.replace(/^\[+\s*/, "").replace(/\s*\]+$/, "");
      if (section === "versions") currentSection = "versions";
      else if (section === "libraries") currentSection = "libraries";
      else if (section === "plugins") currentSection = "plugins";
      else currentSection = null;
      continue;
    }

    if (!currentSection) continue;

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1]!;
    const rawValue = kvMatch[2]!.trim();

    if (currentSection === "versions") {
      const version = extractQuotedString(rawValue);
      if (version) versions.set(key, version);
    } else if (currentSection === "libraries") {
      const dep = parseLibraryEntry(rawValue, versions);
      if (dep) libraries.push(dep);
    } else if (currentSection === "plugins") {
      const dep = parsePluginEntry(rawValue, versions);
      if (dep) plugins.push(dep);
    }
  }

  return { versions, libraries, plugins };
}

function parseLibraryEntry(value: string, versions: Map<string, string>): ParsedDependency | null {
  // Simple string form: "group:artifact:version"
  const simpleVersion = extractQuotedString(value);
  if (simpleVersion) {
    const parts = simpleVersion.split(":");
    if (parts.length === 3) {
      return {
        name: `${parts[0]}:${parts[1]}`,
        version: parts[2]!,
        isDirect: true,
      };
    }
    return null;
  }

  // Inline table form: { module = "group:artifact", version.ref = "key" }
  // or: { group = "group", name = "artifact", version.ref = "key" }
  // or: { module = "group:artifact", version = "1.0.0" }
  const table = parseInlineTable(value);
  if (!table) return null;

  let group: string | undefined;
  let artifact: string | undefined;

  if (table.module) {
    const parts = table.module.split(":");
    if (parts.length === 2) {
      group = parts[0];
      artifact = parts[1];
    }
  } else if (table.group && table.name) {
    group = table.group;
    artifact = table.name;
  }

  if (!group || !artifact) return null;

  const version = resolveVersion(table, versions);

  return {
    name: `${group}:${artifact}`,
    version: version || "*",
    isDirect: true,
  };
}

function parsePluginEntry(value: string, versions: Map<string, string>): ParsedDependency | null {
  // Simple string form: "id:version"
  const simpleVersion = extractQuotedString(value);
  if (simpleVersion) {
    const parts = simpleVersion.split(":");
    if (parts.length === 2) {
      return { name: parts[0]!, version: parts[1]!, isDirect: true };
    }
    return null;
  }

  // Inline table: { id = "plugin.id", version.ref = "key" }
  const table = parseInlineTable(value);
  if (!table || !table.id) return null;

  const version = resolveVersion(table, versions);

  return {
    name: table.id,
    version: version || "*",
    isDirect: true,
  };
}

function resolveVersion(
  table: Record<string, string>,
  versions: Map<string, string>,
): string | null {
  if (table["version.ref"]) {
    return versions.get(table["version.ref"]) ?? null;
  }
  if (table.version) {
    return table.version;
  }
  return null;
}

function extractQuotedString(value: string): string | null {
  const match = value.match(/^"([^"]*)"$/);
  return match ? match[1]! : null;
}

function parseInlineTable(value: string): Record<string, string> | null {
  const match = value.match(/^\{(.*)\}$/);
  if (!match) return null;

  const inner = match[1]!;
  const result: Record<string, string> = {};

  // Match key = "value" or key.subkey = "value" pairs
  const pairRegex = /([a-zA-Z0-9_.-]+)\s*=\s*"([^"]*)"/g;
  for (const pairMatch of inner.matchAll(pairRegex)) {
    result[pairMatch[1]!] = pairMatch[2]!;
  }

  return Object.keys(result).length > 0 ? result : null;
}
