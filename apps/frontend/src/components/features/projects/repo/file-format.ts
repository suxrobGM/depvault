/** File-format helpers shared across the repo browser editor + diff views. */

export type EditorLanguage = "json" | "yaml" | "env" | "plain";

const JSON_FORMATS = new Set(["json", "appsettings", "jsonc"]);
const YAML_FORMATS = new Set(["yaml", "yml"]);
const ENV_FORMATS = new Set(["env", "dotenv"]);

/**
 * Resolve a CodeMirror-friendly language from the backend `format` field,
 * falling back to the file extension in `relativePath`. Secret files carry no
 * `format`, so they rely entirely on the extension fallback.
 */
export function resolveLanguage(format: string | null, relativePath: string): EditorLanguage {
  const fmt = format?.toLowerCase() ?? "";
  if (JSON_FORMATS.has(fmt)) return "json";
  if (YAML_FORMATS.has(fmt)) return "yaml";
  if (ENV_FORMATS.has(fmt)) return "env";

  const lower = relativePath.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  if (lower.includes(".env") || lower.endsWith("env")) return "env";
  return "plain";
}

/** Whether the decrypted text can be edited as structured key/value pairs. */
export function supportsKeyValueForm(language: EditorLanguage): boolean {
  return language === "env";
}

export interface KeyValueRow {
  key: string;
  value: string;
  /** Comment or blank line preserved verbatim so round-trips don't lose structure. */
  raw?: string;
}

/**
 * Parse `.env`-style text into ordered rows. Comments and blank lines are kept as
 * `raw`-only rows so serializing back reproduces the original layout.
 */
export function parseEnv(text: string): KeyValueRow[] {
  const rows: KeyValueRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      rows.push({ key: "", value: "", raw: line });
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      rows.push({ key: "", value: "", raw: line });
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);
    rows.push({ key, value });
  }
  // Drop a single trailing empty row produced by a final newline.
  const last = rows[rows.length - 1];
  if (last && last.raw === "" && last.key === "") rows.pop();
  return rows;
}

/** Serialize key/value rows back into `.env` text. */
export function serializeEnv(rows: KeyValueRow[]): string {
  return rows
    .map((row) => (row.raw !== undefined && row.key === "" ? row.raw : `${row.key}=${row.value}`))
    .join("\n");
}

/** Pretty label for a binary file size placeholder. */
export function binaryPlaceholder(fileSize: number): string {
  return `Binary file (${fileSize.toLocaleString()} bytes)`;
}
