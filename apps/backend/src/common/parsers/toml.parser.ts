import type { ConfigEntry, ConfigParser } from "./types";

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
