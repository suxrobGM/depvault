/** Supported config file format identifiers. */
export const CONFIG_FORMAT_VALUES = [
  "env",
  "appsettings.json",
  "secrets.yaml",
  "config.toml",
] as const;

export type ConfigFormat = (typeof CONFIG_FORMAT_VALUES)[number];
