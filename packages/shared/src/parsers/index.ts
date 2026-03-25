import type { ConfigFormat } from "../constants/config-formats";
import { envParser } from "./env";
import type { ConfigEntry, ConfigParser } from "./types";

export type { ConfigEntry, ConfigParser } from "./types";
export { envParser } from "./env";

export const PARSERS: Partial<Record<ConfigFormat, ConfigParser>> = {
  env: envParser,
};

/** Parse raw config content into key-value entries. Only the env format supports comment preservation. */
export function parseConfig(format: ConfigFormat, content: string): ConfigEntry[] {
  const parser = PARSERS[format];
  if (!parser) {
    throw new Error(`No parser available for format: ${format}`);
  }
  return parser.parse(content);
}
