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
