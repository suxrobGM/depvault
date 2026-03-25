import type { ConfigEntry, ConfigSerializer } from "./types";

export const envSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    return entries
      .map(({ key, value, comment }, index) => {
        const lines: string[] = [];

        // Split leading comment from trailing comment (separated by \0)
        let leading = comment ?? "";
        let trailing = "";
        const nulIdx = leading.indexOf("\0");
        if (nulIdx !== -1) {
          trailing = leading.substring(nulIdx + 1);
          leading = leading.substring(0, nulIdx);
        }

        emitCommentBlock(lines, leading, index > 0);
        lines.push(`${key}=${quoteIfNeeded(value)}`);
        if (trailing) {
          emitCommentBlock(lines, trailing, true);
        }

        return lines.join("\n");
      })
      .join("\n");
  },
};

function emitCommentBlock(lines: string[], block: string, allowBlankLine: boolean): void {
  let text = block;

  if (text.startsWith("\n")) {
    if (allowBlankLine) {
      lines.push("");
    }
    text = text.slice(1);
  }

  // Trailing \n means a blank line after the comment block
  let hasTrailingBlank = false;
  if (text.endsWith("\n")) {
    hasTrailingBlank = true;
    text = text.slice(0, -1);
  }

  if (text) {
    for (const commentLine of text.split("\n")) {
      lines.push(`# ${commentLine}`);
    }
  }

  if (hasTrailingBlank) {
    lines.push("");
  }
}

function quoteIfNeeded(value: string): string {
  if (value.includes(" ") || value.includes("#") || value.includes('"') || value.includes("'")) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value;
}
