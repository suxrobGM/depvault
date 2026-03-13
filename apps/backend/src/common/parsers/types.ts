import type { ConfigEntry } from "@depvault/shared/serializers";

export type { ConfigEntry, ConfigSerializer } from "@depvault/shared/serializers";
export type { ConfigFormat } from "@depvault/shared/constants";

/** Parses raw file content into flat key-value pairs. */
export interface ConfigParser {
  parse(content: string): ConfigEntry[];
}
