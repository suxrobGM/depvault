import type { ConfigEntry, ConfigSerializer } from "./types";

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
