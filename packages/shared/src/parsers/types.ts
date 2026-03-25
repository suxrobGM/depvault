import type { ConfigEntry } from "../serializers/types";

export type { ConfigEntry };

/** Parses raw file content into flat key-value pairs with optional comments. */
export interface ConfigParser {
  parse(content: string): ConfigEntry[];
}
