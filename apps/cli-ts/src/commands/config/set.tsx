import type { ReactElement } from "react";
import { loadConfig, saveConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";

const VALID_KEYS: Record<string, string> = {
  server: "server",
  project: "activeProjectId",
  activeprojectid: "activeProjectId",
  output: "outputFormat",
  outputformat: "outputFormat",
};

export default async function handler(args: string[]): Promise<ReactElement> {
  const [key, ...rest] = args;
  const value = rest.join(" ");

  if (!key || !value) {
    return <ErrorBox message="Usage: /config set <key> <value>" />;
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
  (config as unknown as Record<string, string>)[configKey] = value;
  saveConfig(config);

  return <Success message={`Set ${configKey} = ${value}`} />;
}
