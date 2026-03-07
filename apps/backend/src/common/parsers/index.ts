import { appsettingsParser, appsettingsSerializer } from "./appsettings.parser";
import { envParser, envSerializer } from "./env.parser";
import { tomlParser, tomlSerializer } from "./toml.parser";
import type { ConfigFormat, ConfigParser, ConfigSerializer } from "./types";
import { yamlParser, yamlSerializer } from "./yaml.parser";

export type { ConfigEntry, ConfigFormat, ConfigParser, ConfigSerializer } from "./types";
export { envParser, envSerializer } from "./env.parser";
export { appsettingsParser, appsettingsSerializer } from "./appsettings.parser";
export { yamlParser, yamlSerializer } from "./yaml.parser";
export { tomlParser, tomlSerializer } from "./toml.parser";

export const PARSERS: Record<ConfigFormat, ConfigParser> = {
  env: envParser,
  "appsettings.json": appsettingsParser,
  "secrets.yaml": yamlParser,
  "config.toml": tomlParser,
};

export const SERIALIZERS: Record<ConfigFormat, ConfigSerializer> = {
  env: envSerializer,
  "appsettings.json": appsettingsSerializer,
  "secrets.yaml": yamlSerializer,
  "config.toml": tomlSerializer,
};
