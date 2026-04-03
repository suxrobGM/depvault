import type { ReactElement } from "react";
import { Command } from "clipanion";
import { Text } from "ink";
import { VERSION } from "@/constants";

export default async function handler(_args: string[]): Promise<ReactElement> {
  return <Text>DepVault CLI v{VERSION}</Text>;
}

export class VersionCommand extends Command {
  static override paths = [["version"], ["-v"], ["--version"]];
  static override usage = Command.Usage({ description: "Show CLI version" });

  async execute(): Promise<void> {
    this.context.stdout.write(`DepVault CLI v${VERSION}\n`);
  }
}
