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
