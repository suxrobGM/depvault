/** A flat key-value pair representing a single config entry. */
export interface ConfigEntry {
  key: string;
  value: string;
}

/** Supported config format identifiers. */
export type ConfigFormat = "env" | "appsettings.json" | "secrets.yaml" | "config.toml";

/** Parses raw file content into flat key-value pairs. */
export interface ConfigParser {
  parse(content: string): ConfigEntry[];
}

/** Serializes flat key-value pairs into a config format string. */
export interface ConfigSerializer {
  serialize(entries: ConfigEntry[]): string;
}
