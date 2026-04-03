import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { loadConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";
import { renderResult } from "@/utils/render";

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

export class ConfigGetCommand extends Command {
  static override paths = [["config", "get"]];
  static override usage = Command.Usage({ description: "Get a config value" });

  key = Option.String({ required: true });

  async execute(): Promise<void> {
    await renderResult(this.context.stdout, handler, [this.key]);
  }
}
