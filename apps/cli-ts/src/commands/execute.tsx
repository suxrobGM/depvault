import type { ReactElement } from "react";
import { ok, type CommandResult } from "@/types/command";
import { ErrorBox } from "@/ui/error-box";

type CommandHandler = (args: string[]) => Promise<ReactElement | CommandResult>;

function isCommandResult(value: ReactElement | CommandResult): value is CommandResult {
  return "element" in value;
}

const handlers: Record<string, () => Promise<{ default: CommandHandler }>> = {
  version: () => import("./version"),
  whoami: () => import("./whoami"),
  login: () => import("./login"),
  logout: () => import("./logout"),
  "config set": () => import("./config/set"),
  "config get": () => import("./config/get"),
  project: () => import("./project/index"),
  "project create": () => import("./project/create"),
  "project list": () => import("./project/list"),
  "project select": () => import("./project/select"),
  "project info": () => import("./project/info"),
  unlock: () => import("./unlock"),
  lock: () => import("./lock"),
  pull: () => import("./pull"),
  push: () => import("./push"),
  "env list": () => import("./env/list"),
  "env diff": () => import("./env/diff"),
  "secrets list": () => import("./secrets/list"),
  analyze: () => import("./analyze"),
  "ci pull": () => import("./ci/pull"),
  scan: () => import("./scan"),
  update: () => import("./update"),
};

export async function executeCommand(command: string, args: string[]): Promise<CommandResult> {
  const loader = handlers[command];

  if (!loader) {
    return ok(<ErrorBox message={`Command "/${command}" is not yet implemented.`} />);
  }

  const mod = await loader();
  const result = await mod.default(args);
  return isCommandResult(result) ? result : ok(result);
}
