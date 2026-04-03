import { Cli } from "clipanion";
import { AnalyzeCommand } from "@/commands/analyze";
import { CiPullCommand } from "@/commands/ci/pull";
import { ConfigGetCommand } from "@/commands/config/get";
import { ConfigSetCommand } from "@/commands/config/set";
import { EnvDiffCommand } from "@/commands/env/diff";
import { EnvListCommand } from "@/commands/env/list";
import { LoginCommand } from "@/commands/login";
import { LogoutCommand } from "@/commands/logout";
import { ProjectCreateCommand } from "@/commands/project/create";
import { ProjectInfoCommand } from "@/commands/project/info";
import { ProjectListCommand } from "@/commands/project/list";
import { ProjectSelectCommand } from "@/commands/project/select";
import { PullCommand } from "@/commands/pull";
import { PushCommand } from "@/commands/push";
import { ScanCommand } from "@/commands/scan";
import { SecretsListCommand } from "@/commands/secrets/list";
import { UpdateCommand } from "@/commands/update";
import { VersionCommand } from "@/commands/version";
import { WhoamiCommand } from "@/commands/whoami";
import { VERSION } from "@/constants";

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
  cli.register(AnalyzeCommand);
  cli.register(CiPullCommand);
  cli.register(ScanCommand);
  cli.register(UpdateCommand);

  return cli;
}
