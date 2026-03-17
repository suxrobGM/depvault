import { BadRequestError } from "@/common/errors";
import type { ConfigEntry, ConfigParser } from "./types";

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
    flattenValue("", json, entries);
    return entries;
  },
};

function flattenValue(key: string, value: unknown, result: ConfigEntry[]): void {
  if (value === null || value === undefined) {
    result.push({ key, value: "" });
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      flattenValue(`${key}__${i}`, value[i], result);
    }
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flattenValue(key ? `${key}__${k}` : k, v, result);
    }
  } else {
    result.push({ key, value: String(value) });
  }
}
