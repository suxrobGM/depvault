import type { ReactElement } from "react";
import { loadConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";

const VALID_KEYS: Record<string, string> = {
  server: "server",
  project: "activeProjectId",
  activeprojectid: "activeProjectId",
  output: "outputFormat",
  outputformat: "outputFormat",
};

export default async function handler(args: string[]): Promise<ReactElement> {
  const [key] = args;

  if (!key) {
    return <ErrorBox message="Usage: /config get <key>" />;
  }

  const configKey = VALID_KEYS[key.toLowerCase()];
  if (!configKey) {
    return (
      <ErrorBox
        message={`Unknown config key "${key}". Valid keys: ${Object.keys(VALID_KEYS).join(", ")}`}
      />
    );
  }

  const config = loadConfig();
  const value = (config as unknown as Record<string, string>)[configKey] ?? "(not set)";

  return <KeyValue label={configKey} value={value} />;
}
