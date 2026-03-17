using System.CommandLine;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class PullCommands(
    CommandContext ctx,
    VaultGroupSelector vaultGroupSelector,
    EnvPuller envPuller,
    SecretsPuller secretsPuller)
{
    public Command CreatePullCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string?>("--environment")
            { Description = "Environment type (prompts if not set)" };
        var vaultGroupsOpt = new Option<string?>("--vault-groups")
            { Description = "Comma-separated vault group names" };
        var includeSecretsOpt = new Option<bool>("--include-secrets")
            { Description = "Also download secret files", DefaultValueFactory = _ => true };
        var formatOpt = new Option<string>("--format")
        {
            Description = "Export format (env, appsettings.json, secrets.yaml, config.toml)",
            DefaultValueFactory = _ => "env"
        };
        var outputDirOpt = new Option<string>("--output-dir")
            { Description = "Base output directory", DefaultValueFactory = _ => "." };
        var forceOpt = new Option<bool>("--force") { Description = "Overwrite without prompting" };

        var cmd = new Command("pull", "Pull environment variables and secret files")
            { projectOpt, envOpt, vaultGroupsOpt, includeSecretsOpt, formatOpt, outputDirOpt, forceOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var projectId = ctx.RequireProjectId(parseResult, projectOpt);
            if (projectId is null)
            {
                return;
            }

            var groups = await vaultGroupSelector.SelectAsync(projectId, parseResult.GetValue(vaultGroupsOpt), ct);
            if (groups is null)
            {
                return;
            }

            var envType = ctx.ResolveEnvironmentType(parseResult.GetValue(envOpt), null);
            var format = parseResult.GetValue(formatOpt) ?? "env";
            var outputDir = Path.GetFullPath(parseResult.GetValue(outputDirOpt) ?? ".");
            var includeSecrets = parseResult.GetValue(includeSecretsOpt);
            var force = parseResult.GetValue(forceOpt);

            if (!force && !ConfirmOverwrite(outputDir))
            {
                return;
            }

            AnsiConsole.MarkupLine($"[cyan1]Pulling ({envType})...[/]");

            var envCount = await envPuller.PullAsync(projectId, groups, envType, format, outputDir, ct);

            var secretCount = 0;
            if (includeSecrets)
            {
                secretCount = await secretsPuller.PullAsync(projectId, groups, envType, outputDir, ct);
            }

            AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess($"Pulled {envCount} env file(s) and {secretCount} secret file(s).");
        });

        return cmd;
    }

    private bool ConfirmOverwrite(string outputDir)
    {
        if (!ctx.Prompter.IsInteractive)
        {
            return true;
        }

        var hasExisting = Directory.Exists(outputDir) &&
                          Directory.EnumerateFiles(outputDir, "*", SearchOption.AllDirectories)
                              .Any(f => f.Contains(".env", StringComparison.OrdinalIgnoreCase)
                                        || f.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
                                        || f.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase)
                                        || f.EndsWith(".yml", StringComparison.OrdinalIgnoreCase)
                                        || f.EndsWith(".toml", StringComparison.OrdinalIgnoreCase));

        if (hasExisting)
        {
            return ctx.Prompter.Confirm("Existing files may be overwritten. Continue?");
        }

        return true;
    }
}
