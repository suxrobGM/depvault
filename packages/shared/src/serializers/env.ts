import type { ConfigEntry, ConfigSerializer } from "./types";

export const envSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    return entries
      .map(({ key, value, comment }, index) => {
        const lines: string[] = [];
        let text = comment ?? "";

        if (text.startsWith("\n")) {
          if (index > 0) {
            lines.push("");
          }
          text = text.slice(1);
        }

        if (text) {
          for (const commentLine of text.split("\n")) {
            lines.push(`# ${commentLine}`);
          }
        }
        lines.push(`${key}=${quoteIfNeeded(value)}`);
        return lines.join("\n");
      })
      .join("\n");
  },
};

function quoteIfNeeded(value: string): string {
  if (value.includes(" ") || value.includes("#") || value.includes('"') || value.includes("'")) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value;
}
