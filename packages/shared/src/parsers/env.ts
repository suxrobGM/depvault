import type { ConfigEntry, ConfigParser } from "./types";

export const envParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    const lines = content.split(/\r?\n/);
    /** Raw inter-variable lines: comment text (without #) or "" for blank lines. */
    const pending: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        if (entries.length > 0 || pending.length > 0) {
          pending.push("");
        }
        continue;
      }

      if (line.startsWith("#")) {
        pending.push(line.slice(1).trimStart());
        continue;
      }

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        pending.length = 0;
        continue;
      }

      const key = line.substring(0, eqIndex).trim();
      if (!key) {
        pending.length = 0;
        continue;
      }

      let value = line.substring(eqIndex + 1).trim();
      value = stripQuotes(value);

      const entry: ConfigEntry = { key, value };
      const comment = encodePending(pending);
      if (comment !== null) {
        entry.comment = comment;
      }

      entries.push(entry);
    }

    // Trailing lines after the last variable
    if (pending.length > 0 && entries.length > 0) {
      const trailing = encodePending(pending);
      if (trailing !== null) {
        const last = entries[entries.length - 1]!;
        // Append trailing comment separated by \0 so serializer can distinguish
        last.comment = last.comment != null ? `${last.comment}\0${trailing}` : `\0${trailing}`;
      }
    }

    return entries;
  },
};

/**
 * Encode the pending buffer into a comment string.
 *
 * The buffer contains comment text strings and "" for blank lines.
 * Leading blank lines → a `\n` prefix (signals spacing from previous variable).
 * Inner blank lines → `\n\n` between comment segments (preserved as-is).
 * Trailing blank lines in buffer → ignored (spacing before the variable itself).
 */
function encodePending(pending: string[]): string | null {
  if (pending.length === 0) return null;

  // Check for trailing blank lines
  let end = pending.length;
  while (end > 0 && pending[end - 1] === "") {
    end--;
  }

  if (end === 0) {
    // All blank lines, no comment text — just spacing
    pending.length = 0;
    return "\n";
  }

  const hasTrailingBlank = end < pending.length;

  // Count leading blank lines
  let start = 0;
  while (start < end && pending[start] === "") {
    start++;
  }

  let result = start > 0 ? "\n" : "";

  for (let i = start; i < end; i++) {
    if (i > start) {
      result += "\n";
    }
    result += pending[i];
  }

  // Trailing blank lines = blank line between the comment block and the next variable
  if (hasTrailingBlank) {
    result += "\n";
  }

  pending.length = 0;
  return result || null;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
