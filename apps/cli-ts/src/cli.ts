import { Cli, Command, Option } from "clipanion";
import { VERSION } from "@/constants";

type CommandHandler = (args: string[]) => Promise<import("react").ReactElement>;

/** Render a command handler's ReactElement result to stdout. */
async function renderResult(
  stdout: NodeJS.WritableStream,
  handler: CommandHandler,
  args: string[] = [],
): Promise<void> {
  const result = await handler(args);
  if (result) {
    const { renderToString } = await import("ink");
    stdout.write(renderToString(result) + "\n");
  }
}

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
    await renderResult(this.context.stdout, handler);
  }
}

class LoginCommand extends Command {
  static override paths = [["login"]];
  static override usage = Command.Usage({ description: "Authenticate via browser" });

  server = Option.String("--server", { required: false });

  async execute(): Promise<void> {
    const args = this.server ? [`--server=${this.server}`] : [];
    const handler = (await import("@/commands/login")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class LogoutCommand extends Command {
  static override paths = [["logout"]];
  static override usage = Command.Usage({ description: "Clear credentials" });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/logout")).default;
    await renderResult(this.context.stdout, handler);
  }
}

class ConfigSetCommand extends Command {
  static override paths = [["config", "set"]];
  static override usage = Command.Usage({ description: "Set a config value" });

  key = Option.String({ required: true });
  value = Option.String({ required: true });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/config/set")).default;
    await renderResult(this.context.stdout, handler, [this.key, this.value]);
  }
}

class ConfigGetCommand extends Command {
  static override paths = [["config", "get"]];
  static override usage = Command.Usage({ description: "Get a config value" });

  key = Option.String({ required: true });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/config/get")).default;
    await renderResult(this.context.stdout, handler, [this.key]);
  }
}

class ProjectListCommand extends Command {
  static override paths = [["project", "list"]];
  static override usage = Command.Usage({ description: "List your projects" });

  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args = this.output ? [`--output=${this.output}`] : [];
    const handler = (await import("@/commands/project/list")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class ProjectCreateCommand extends Command {
  static override paths = [["project", "create"]];
  static override usage = Command.Usage({ description: "Create a new project" });

  name = Option.String({ required: true });
  description = Option.String("--description,-d", { required: false });
  repo = Option.String("--repo", { required: false });

  async execute(): Promise<void> {
    const args = [this.name];
    if (this.description) args.push(`--description=${this.description}`);
    if (this.repo) args.push(`--repo=${this.repo}`);
    const handler = (await import("@/commands/project/create")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class ProjectSelectCommand extends Command {
  static override paths = [["project", "select"]];
  static override usage = Command.Usage({ description: "Set the active project" });

  id = Option.String({ required: true });

  async execute(): Promise<void> {
    const handler = (await import("@/commands/project/select")).default;
    await renderResult(this.context.stdout, handler, [this.id]);
  }
}

class ProjectInfoCommand extends Command {
  static override paths = [["project", "info"]];
  static override usage = Command.Usage({ description: "Show project details" });

  project = Option.String("--project", { required: false });

  async execute(): Promise<void> {
    const args = this.project ? [`--project=${this.project}`] : [];
    const handler = (await import("@/commands/project/info")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class PullCommand extends Command {
  static override paths = [["pull"]];
  static override usage = Command.Usage({ description: "Pull env vars + secret files" });

  project = Option.String("--project", { required: false });
  environment = Option.String("--environment", { required: false });
  format = Option.String("--format", { required: false });
  outputDir = Option.String("--output-dir", { required: false });
  noSecrets = Option.Boolean("--no-secrets", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.format) args.push(`--format=${this.format}`);
    if (this.outputDir) args.push(`--output-dir=${this.outputDir}`);
    if (this.noSecrets) args.push("--no-secrets");
    const handler = (await import("@/commands/pull")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class PushCommand extends Command {
  static override paths = [["push"]];
  static override usage = Command.Usage({ description: "Push env vars + secret files" });

  file = Option.String("--file", { required: false });
  project = Option.String("--project", { required: false });
  environment = Option.String("--environment", { required: false });
  format = Option.String("--format", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.file) args.push(`--file=${this.file}`);
    if (this.project) args.push(`--project=${this.project}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.format) args.push(`--format=${this.format}`);
    const handler = (await import("@/commands/push")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class EnvListCommand extends Command {
  static override paths = [["env", "list"]];
  static override usage = Command.Usage({ description: "List environment variables" });

  project = Option.String("--project", { required: false });
  vaultGroup = Option.String("--vault-group", { required: false });
  environment = Option.String("--environment", { required: false });
  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.vaultGroup) args.push(`--vault-group=${this.vaultGroup}`);
    if (this.environment) args.push(`--environment=${this.environment}`);
    if (this.output) args.push(`--output=${this.output}`);
    const handler = (await import("@/commands/env/list")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class EnvDiffCommand extends Command {
  static override paths = [["env", "diff"]];
  static override usage = Command.Usage({ description: "Compare environments" });

  project = Option.String("--project", { required: false });
  vaultGroup = Option.String("--vault-group", { required: true });
  environments = Option.String("--environments", { required: true });
  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [
      `--vault-group=${this.vaultGroup}`,
      `--environments=${this.environments}`,
    ];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.output) args.push(`--output=${this.output}`);
    const handler = (await import("@/commands/env/diff")).default;
    await renderResult(this.context.stdout, handler, args);
  }
}

class SecretsListCommand extends Command {
  static override paths = [["secrets", "list"]];
  static override usage = Command.Usage({ description: "List secret files" });

  project = Option.String("--project", { required: false });
  output = Option.String("--output", { required: false });

  async execute(): Promise<void> {
    const args: string[] = [];
    if (this.project) args.push(`--project=${this.project}`);
    if (this.output) args.push(`--output=${this.output}`);
    const handler = (await import("@/commands/secrets/list")).default;
    await renderResult(this.context.stdout, handler, args);
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
  cli.register(ProjectListCommand);
  cli.register(ProjectCreateCommand);
  cli.register(ProjectSelectCommand);
  cli.register(ProjectInfoCommand);
  cli.register(PullCommand);
  cli.register(PushCommand);
  cli.register(EnvListCommand);
  cli.register(EnvDiffCommand);
  cli.register(SecretsListCommand);

  return cli;
}
