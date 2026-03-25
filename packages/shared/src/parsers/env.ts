import type { ConfigEntry, ConfigParser } from "./types";

export const envParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    const lines = content.split(/\r?\n/);
    let pendingComment: string[] = [];
    let sawBlankLine = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        sawBlankLine = entries.length > 0 || pendingComment.length > 0;
        pendingComment = [];
        continue;
      }

      if (line.startsWith("#")) {
        pendingComment.push(line.slice(1).trimStart());
        continue;
      }

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        pendingComment = [];
        sawBlankLine = false;
        continue;
      }

      const key = line.substring(0, eqIndex).trim();
      if (!key) {
        pendingComment = [];
        sawBlankLine = false;
        continue;
      }

      let value = line.substring(eqIndex + 1).trim();
      value = stripQuotes(value);

      const entry: ConfigEntry = { key, value };
      const commentText = pendingComment.length > 0 ? pendingComment.join("\n") : "";
      if (sawBlankLine || commentText) {
        entry.comment = sawBlankLine ? `\n${commentText}` : commentText;
      }
      entries.push(entry);
      pendingComment = [];
      sawBlankLine = false;
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
