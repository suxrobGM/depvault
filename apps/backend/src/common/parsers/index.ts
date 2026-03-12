import { appsettingsParser } from "./appsettings.parser";
import { envParser } from "./env.parser";
import { tomlParser } from "./toml.parser";
import type { ConfigFormat, ConfigParser } from "./types";
import { yamlParser } from "./yaml.parser";

export type { ConfigEntry, ConfigFormat, ConfigParser, ConfigSerializer } from "./types";
export { envParser } from "./env.parser";
export { appsettingsParser } from "./appsettings.parser";
export { yamlParser } from "./yaml.parser";
export { tomlParser } from "./toml.parser";
export { SERIALIZERS, serializeConfig, getConfigFileName } from "@shared/serializers";

export const PARSERS: Record<ConfigFormat, ConfigParser> = {
  env: envParser,
  "appsettings.json": appsettingsParser,
  "secrets.yaml": yamlParser,
  "config.toml": tomlParser,
};
