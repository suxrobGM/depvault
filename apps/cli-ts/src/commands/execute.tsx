import type { ReactElement } from "react";
import { ErrorBox } from "@/ui/error-box";

type CommandHandler = (args: string[]) => Promise<ReactElement>;

const handlers: Record<string, () => Promise<{ default: CommandHandler }>> = {
  version: () => import("./version"),
  whoami: () => import("./whoami"),
  login: () => import("./login"),
  logout: () => import("./logout"),
  "config set": () => import("./config/set"),
  "config get": () => import("./config/get"),
};

export async function executeCommand(command: string, args: string[]): Promise<ReactElement> {
  const loader = handlers[command];

  if (!loader) {
    return <ErrorBox message={`Command "/${command}" is not yet implemented.`} />;
  }

  const mod = await loader();
  return mod.default(args);
}
