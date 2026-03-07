import type { ConfigEntry, ConfigParser, ConfigSerializer } from "./types";

export const tomlParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    const lines = content.split(/\r?\n/);
    let currentSection = "";

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) continue;

      // Section header [section] or [section.subsection]
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1]!.replace(/\./g, "__");
        continue;
      }

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) continue;

      const key = line.substring(0, eqIndex).trim();
      const rawValue = line.substring(eqIndex + 1).trim();

      if (!key) continue;

      const fullKey = currentSection ? `${currentSection}__${key}` : key;
      entries.push({ key: fullKey, value: stripTomlValue(rawValue) });
    }

    return entries;
  },
};

function stripTomlValue(value: string): string {
  // Strip inline comments (only outside quotes)
  const stripped = stripTomlInlineComment(value);

  if (
    (stripped.startsWith('"') && stripped.endsWith('"')) ||
    (stripped.startsWith("'") && stripped.endsWith("'"))
  ) {
    return stripped.slice(1, -1);
  }

  return stripped;
}

function stripTomlInlineComment(value: string): string {
  if (value.startsWith('"') || value.startsWith("'")) {
    return value;
  }

  const hashIndex = value.indexOf(" #");
  if (hashIndex !== -1) {
    return value.substring(0, hashIndex).trim();
  }
  return value;
}

export const tomlSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    const topLevel: ConfigEntry[] = [];
    const sections = new Map<string, ConfigEntry[]>();

    for (const entry of entries) {
      const parts = entry.key.split("__");

      if (parts.length === 1) {
        topLevel.push(entry);
      } else {
        const sectionParts = parts.slice(0, -1);
        const sectionName = sectionParts.join(".");
        const leafKey = parts[parts.length - 1]!;

        if (!sections.has(sectionName)) {
          sections.set(sectionName, []);
        }
        sections.get(sectionName)!.push({ key: leafKey, value: entry.value });
      }
    }

    const lines: string[] = [];

    for (const entry of topLevel) {
      lines.push(`${entry.key} = ${quoteTomlValue(entry.value)}`);
    }

    for (const [section, sectionEntries] of sections) {
      if (lines.length > 0) lines.push("");
      lines.push(`[${section}]`);
      for (const entry of sectionEntries) {
        lines.push(`${entry.key} = ${quoteTomlValue(entry.value)}`);
      }
    }

    return lines.join("\n");
  },
};

function quoteTomlValue(value: string): string {
  if (value === "true" || value === "false") return value;
  if (/^\d+(\.\d+)?$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
