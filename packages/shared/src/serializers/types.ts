/** A flat key-value pair representing a single config entry. */
export interface ConfigEntry {
  key: string;
  value: string;
  /**
   * Raw comment text (without # prefix) preceding this variable in the original file.
   * A leading `\n` indicates a blank line preceded this entry's comment/variable block.
   */
  comment?: string;
}

/** Serializes flat key-value pairs into a config format string. */
export interface ConfigSerializer {
  serialize(entries: ConfigEntry[]): string;
}
