import type { ReactElement } from "react";
import { Command, Option } from "clipanion";
import { loadConfig, saveConfig } from "@/services/config";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { renderResult } from "@/utils/render";

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

export class ConfigSetCommand extends Command {
  static override paths = [["config", "set"]];
  static override usage = Command.Usage({ description: "Set a config value" });

  key = Option.String({ required: true });
  value = Option.String({ required: true });

  async execute(): Promise<void> {
    await renderResult(this.context.stdout, handler, [this.key, this.value]);
  }
}
