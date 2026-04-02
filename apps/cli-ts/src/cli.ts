import { Cli, Command, Option } from "clipanion";
import { VERSION } from "@/constants";

// ── One-shot Commands ──

class VersionCommand extends Command {
  static override paths = [["version"], ["-v"], ["--version"]];
  static override usage = Command.Usage({ description: "Show CLI version" });

  async execute(): Promise<void> {
    this.context.stdout.write(`DepVault CLI v${VERSION}\n`);
  }
}

class WhoamiCommand extends Command {
  static override paths = [["whoami"]];
  static override usage = Command.Usage({ description: "Show current user" });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/whoami")).default;
    const result = await handler([]);
    if (result) {
      const { renderToString } = await import("ink");
      this.context.stdout.write(renderToString(result as any) + "\n");
    }
  }
}

class LoginCommand extends Command {
  static override paths = [["login"]];
  static override usage = Command.Usage({ description: "Authenticate via browser" });

  server = Option.String("--server", { required: false });

  async execute(): Promise<void> {
    const args = this.server ? [`--server=${this.server}`] : [];
    const handler = (await import("@/commands/login")).default;
    const result = await handler(args);
    if (result) {
      const { renderToString } = await import("ink");
      this.context.stdout.write(renderToString(result as any) + "\n");
    }
  }
}

class LogoutCommand extends Command {
  static override paths = [["logout"]];
  static override usage = Command.Usage({ description: "Clear credentials" });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/logout")).default;
    const result = await handler([]);
    if (result) {
      const { renderToString } = await import("ink");
      this.context.stdout.write(renderToString(result as any) + "\n");
    }
  }
}

class ConfigSetCommand extends Command {
  static override paths = [["config", "set"]];
  static override usage = Command.Usage({ description: "Set a config value" });

  key = Option.String({ required: true });
  value = Option.String({ required: true });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/config/set")).default;
    const result = await handler([this.key, this.value]);
    if (result) {
      const { renderToString } = await import("ink");
      this.context.stdout.write(renderToString(result as any) + "\n");
    }
  }
}

class ConfigGetCommand extends Command {
  static override paths = [["config", "get"]];
  static override usage = Command.Usage({ description: "Get a config value" });

  key = Option.String({ required: true });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/config/get")).default;
    const result = await handler([this.key]);
    if (result) {
      const { renderToString } = await import("ink");
      this.context.stdout.write(renderToString(result as any) + "\n");
    }
  }
}

export function createCli(): Cli {
  const cli = new Cli({
    binaryLabel: "DepVault CLI",
    binaryName: "depvault",
    binaryVersion: VERSION,
  });

  cli.register(VersionCommand);
  cli.register(WhoamiCommand);
  cli.register(LoginCommand);
  cli.register(LogoutCommand);
  cli.register(ConfigSetCommand);
  cli.register(ConfigGetCommand);

  return cli;
}
