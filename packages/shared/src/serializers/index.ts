import type { ConfigFormat } from "../constants/config-formats";
import { envSerializer } from "./env";
import { jsonSerializer } from "./json";
import { tomlSerializer } from "./toml";
import type { ConfigEntry, ConfigSerializer } from "./types";
import { yamlSerializer } from "./yaml";

export type { ConfigEntry, ConfigSerializer } from "./types";
export { envSerializer } from "./env";
export { jsonSerializer } from "./json";
export { yamlSerializer } from "./yaml";
export { tomlSerializer } from "./toml";

export const SERIALIZERS: Record<ConfigFormat, ConfigSerializer> = {
  env: envSerializer,
  "appsettings.json": jsonSerializer,
  "secrets.yaml": yamlSerializer,
  "config.toml": tomlSerializer,
};

/** Serialize key-value entries into the given config format. */
export function serializeConfig(format: ConfigFormat, entries: ConfigEntry[]): string {
  return SERIALIZERS[format].serialize(entries);
}

/** Get the canonical file name for a config format. */
export function getConfigFileName(format: ConfigFormat): string {
  return format === "env" ? ".env" : format;
}
