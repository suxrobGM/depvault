/** File-format helpers shared across the repo browser editor + diff views. */

export type EditorLanguage = "json" | "yaml" | "env" | "xml" | "plain";

/**
 * Maps both backend `format` values and file extensions (sans dot) to an editor
 * language. The single source of truth for both resolution paths in
 * `resolveLanguage` — add a new file type here once, not in two if-chains.
 */
const LANGUAGE_BY_TOKEN: Record<string, EditorLanguage> = {
  json: "json",
  appsettings: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  env: "env",
  dotenv: "env",
  xml: "xml",
  csproj: "xml",
  props: "xml",
  targets: "xml",
  plist: "xml",
  config: "xml",
};

/**
 * Resolve a CodeMirror-friendly language from the backend `format` field,
 * falling back to the file extension in `relativePath`. Secret files carry no
 * `format`, so they rely entirely on the extension fallback.
 */
export function resolveLanguage(format: string | null, relativePath: string): EditorLanguage {
  const byFormat = LANGUAGE_BY_TOKEN[format?.toLowerCase() ?? ""];
  if (byFormat) {
    return byFormat;
  }

  const lower = relativePath.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  const byExt = LANGUAGE_BY_TOKEN[ext];

  if (byExt) {
    return byExt;
  }
  if (lower.includes(".env") || lower.endsWith("env")) {
    return "env";
  }
  return "plain";
}

/** The final path segment of a relative path (e.g. `a/b/c.json` → `c.json`). */
export function basename(relativePath: string): string {
  return relativePath.split("/").pop() ?? relativePath;
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
