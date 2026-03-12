import type { ConfigEntry } from "@shared/serializers";

export type { ConfigEntry, ConfigSerializer } from "@shared/serializers";
export type { ConfigFormat } from "@shared/constants/config-formats";

/** Parses raw file content into flat key-value pairs. */
export interface ConfigParser {
  parse(content: string): ConfigEntry[];
}
