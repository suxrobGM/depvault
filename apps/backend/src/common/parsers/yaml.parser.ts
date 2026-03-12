import type { ConfigEntry, ConfigParser } from "./types";

export const yamlParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    const lines = content.split(/\r?\n/);
    const keyStack: { indent: number; key: string }[] = [];

    for (const rawLine of lines) {
      if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

      const indent = rawLine.length - rawLine.trimStart().length;
      const line = rawLine.trim();

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const rest = line.substring(colonIndex + 1).trim();

      if (!key) continue;

      // Pop keys at same or deeper indent level
      while (keyStack.length > 0 && keyStack[keyStack.length - 1]!.indent >= indent) {
        keyStack.pop();
      }

      if (rest === "" || rest.startsWith("#")) {
        // Nested object — push to stack
        keyStack.push({ indent, key });
      } else {
        const fullKey = [...keyStack.map((k) => k.key), key].join("__");
        entries.push({ key: fullKey, value: stripYamlQuotes(rest) });
      }
    }

    return entries;
  },
};

function stripYamlQuotes(value: string): string {
  const withoutComment = stripInlineComment(value);

  if (
    (withoutComment.startsWith('"') && withoutComment.endsWith('"')) ||
    (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
  ) {
    return withoutComment.slice(1, -1);
  }

  return withoutComment;
}

function stripInlineComment(value: string): string {
  if (value.startsWith('"') || value.startsWith("'")) {
    return value;
  }

  const hashIndex = value.indexOf(" #");
  if (hashIndex !== -1) {
    return value.substring(0, hashIndex).trim();
  }
  return value;
}
