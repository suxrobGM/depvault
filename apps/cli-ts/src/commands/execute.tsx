import type { ReactElement } from "react";
import { ok, type CommandContext, type CommandResult } from "@/types/command";
import { ErrorBox } from "@/ui/error-box";

type CommandHandler = (
  args: string[],
  ctx?: CommandContext,
) => Promise<ReactElement | CommandResult>;

function isCommandResult(value: ReactElement | CommandResult): value is CommandResult {
  return "element" in value;
}

const handlers: Record<string, () => Promise<{ default: CommandHandler }>> = {
  // Interactive REPL commands (single-word)
  version: () => import("./version"),
  whoami: () => import("./whoami"),
  login: () => import("./login"),
  logout: () => import("./logout"),
  unlock: () => import("./unlock"),
  lock: () => import("./lock"),
  project: () => import("./project/index"),
  pull: () => import("./pull"),
  push: () => import("./push"),
  env: () => import("./env/index"),
  secrets: () => import("./secrets/index"),
  config: () => import("./config/index"),
  analyze: () => import("./analyze"),
  scan: () => import("./scan"),
  update: () => import("./update"),

  // Non-interactive subcommands (two-word, used with args)
  "project create": () => import("./project/create"),
  "project list": () => import("./project/list"),
  "project select": () => import("./project/select"),
  "project info": () => import("./project/info"),
  "config set": () => import("./config/set"),
  "config get": () => import("./config/get"),
  "ci pull": () => import("./ci/pull"),
};

export async function executeCommand(
  command: string,
  args: string[],
  ctx?: CommandContext,
): Promise<CommandResult> {
  const loader = handlers[command];

  if (!loader) {
    return ok(<ErrorBox message={`Command "/${command}" is not yet implemented.`} />);
  }

  const mod = await loader();
  const result = await mod.default(args, ctx);
  return isCommandResult(result) ? result : ok(result);
}
