/** A flat key-value pair representing a single config entry. */
export interface ConfigEntry {
  key: string;
  value: string;
}

/** Serializes flat key-value pairs into a config format string. */
export interface ConfigSerializer {
  serialize(entries: ConfigEntry[]): string;
}
