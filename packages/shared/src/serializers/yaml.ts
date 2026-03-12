import type { ConfigEntry, ConfigSerializer } from "./types";

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
