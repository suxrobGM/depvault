import type { ConfigEntry, ConfigSerializer } from "./types";

export const jsonSerializer: ConfigSerializer = {
  serialize(entries: ConfigEntry[]): string {
    const root: Record<string, unknown> = {};

    for (const { key, value } of entries) {
      const parts = key.split("__");
      setNested(root, parts, value);
    }

    return JSON.stringify(root, null, 2);
  },
};

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

function setNested(obj: Record<string, unknown>, parts: string[], value: string): void {
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const nextPart = parts[i + 1]!;

    if (current[part] === undefined || current[part] === null) {
      current[part] = isNumeric(nextPart) ? [] : {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]!] = value;
}
