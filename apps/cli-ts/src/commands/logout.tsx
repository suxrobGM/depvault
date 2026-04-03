import type { ReactElement } from "react";
import { Command } from "clipanion";
import { resetApiClient } from "@/services/api-client";
import { clearCredentials } from "@/services/credentials";
import { Success } from "@/ui/success";
import { renderResult } from "@/utils/render";

export default async function handler(_args: string[]): Promise<ReactElement> {
  clearCredentials();
  resetApiClient();
  return <Success message="Logged out. Credentials cleared." />;
}

export class LogoutCommand extends Command {
  static override paths = [["logout"]];
  static override usage = Command.Usage({ description: "Clear credentials" });

  async execute(): Promise<void> {
    await renderResult(this.context.stdout, handler);
  }
}
