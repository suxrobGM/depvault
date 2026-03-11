import type { SelectOption } from "../types";

/** Supported config file format identifiers. */
export const CONFIG_FORMAT_VALUES = [
  "env",
  "appsettings.json",
  "secrets.yaml",
  "config.toml",
] as const;

export type ConfigFormat = (typeof CONFIG_FORMAT_VALUES)[number];

/** Format options with display labels for UI dropdowns. */
export const CONFIG_FORMATS = [
  { value: "env", label: ".env" },
  { value: "appsettings.json", label: "appsettings.json" },
  { value: "secrets.yaml", label: "secrets.yaml" },
  { value: "config.toml", label: "config.toml" },
] as const satisfies readonly SelectOption<ConfigFormat>[];
