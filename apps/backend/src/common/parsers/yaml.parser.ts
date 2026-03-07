import type { ConfigEntry, ConfigParser, ConfigSerializer } from "./types";

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
  // Strip inline comments
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
  // Don't strip # inside quotes
  if (value.startsWith('"') || value.startsWith("'")) {
    return value;
  }

  const hashIndex = value.indexOf(" #");
  if (hashIndex !== -1) {
    return value.substring(0, hashIndex).trim();
  }
  return value;
}

export const yamlSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    const root: Record<string, unknown> = {};

    for (const { key, value } of entries) {
      const parts = key.split("__");
      setNested(root, parts, value);
    }

    const lines: string[] = [];
    serializeObject(root, 0, lines);
    return lines.join("\n");
  },
};

function setNested(obj: Record<string, unknown>, parts: string[], value: string): void {
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]!] = value;
}

function serializeObject(obj: Record<string, unknown>, depth: number, lines: string[]): void {
  const indent = "  ".repeat(depth);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      lines.push(`${indent}${key}:`);
      serializeObject(value as Record<string, unknown>, depth + 1, lines);
    } else {
      lines.push(`${indent}${key}: ${quoteYamlValue(String(value ?? ""))}`);
    }
  }
}

function quoteYamlValue(value: string): string {
  if (
    value === "" ||
    value === "true" ||
    value === "false" ||
    value === "null" ||
    /^\d+(\.\d+)?$/.test(value) ||
    value.includes(":") ||
    value.includes("#")
  ) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}
