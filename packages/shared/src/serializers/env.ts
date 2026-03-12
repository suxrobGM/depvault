import type { ConfigEntry, ConfigSerializer } from "./types";

export const envSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    return entries.map(({ key, value }) => `${key}=${quoteIfNeeded(value)}`).join("\n");
  },
};

function quoteIfNeeded(value: string): string {
  if (value.includes(" ") || value.includes("#") || value.includes('"') || value.includes("'")) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value;
}
