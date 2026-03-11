import type { ConfigFormat } from "@depvault/shared/constants";

export const CONFIG_FILE_ACCEPT = ".env,.txt,.json,.yaml,.yml,.toml";

/**
 * Detect config format based on file extension. Returns null if format cannot be determined.
 * Supported formats:
 * - .env or .env.* => "env"
 * - .json => "appsettings.json"
 * - .yaml or .yml => "secrets.yaml"
 * - .toml => "config.toml"
 */
export function detectFormatFromExtension(fileName: string): ConfigFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "appsettings.json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "secrets.yaml";
  if (lower.endsWith(".toml")) return "config.toml";
  if (lower.endsWith(".env") || lower.startsWith(".env")) return "env";
  return null;
}
