import type { ConfigEntry, ConfigParser } from "./types";

export const envParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) continue;

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) continue;

      const key = line.substring(0, eqIndex).trim();
      if (!key) continue;

      let value = line.substring(eqIndex + 1).trim();
      value = stripQuotes(value);

      entries.push({ key, value });
    }

    return entries;
  },
};

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
