import { BadRequestError } from "@/common/errors";
import type { ConfigEntry, ConfigParser, ConfigSerializer } from "./types";

export const appsettingsParser: ConfigParser = {
  parse(content: string): ConfigEntry[] {
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      throw new BadRequestError("Invalid JSON in appsettings file");
    }

    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      throw new BadRequestError("appsettings.json must be a JSON object");
    }

    const entries: ConfigEntry[] = [];
    flattenObject(json as Record<string, unknown>, "", entries);
    return entries;
  },
};

function flattenObject(obj: Record<string, unknown>, prefix: string, result: ConfigEntry[]): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}__${key}` : key;

    if (value === null || value === undefined) {
      result.push({ key: fullKey, value: "" });
    } else if (typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, fullKey, result);
    } else {
      result.push({ key: fullKey, value: String(value) });
    }
  }
}

export const appsettingsSerializer: ConfigSerializer = {
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
