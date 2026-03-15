using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class PullCommands(
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    VaultGroupSelector vaultGroupSelector,
    EnvPuller envPuller,
    SecretsPuller secretsPuller)
{
    public Command CreatePullCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string>("--environment")
        { Description = "Environment type", DefaultValueFactory = _ => "DEVELOPMENT" };
        var vaultGroupsOpt = new Option<string?>("--vault-groups") { Description = "Comma-separated vault group names" };
        var includeSecretsOpt = new Option<bool>("--include-secrets")
        { Description = "Also download secret files", DefaultValueFactory = _ => true };
        var outputDirOpt = new Option<string>("--output-dir")
        { Description = "Base output directory", DefaultValueFactory = _ => "." };
        var forceOpt = new Option<bool>("--force") { Description = "Overwrite without prompting" };

        var cmd = new Command("pull", "Pull environment variables and secret files")
        { projectOpt, envOpt, vaultGroupsOpt, includeSecretsOpt, outputDirOpt, forceOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            await ExecutePullAsync(
                parseResult.GetValue(projectOpt),
                parseResult.GetValue(envOpt) ?? "DEVELOPMENT",
                parseResult.GetValue(vaultGroupsOpt),
                "env",
                parseResult.GetValue(includeSecretsOpt),
                parseResult.GetValue(outputDirOpt) ?? ".",
                parseResult.GetValue(forceOpt),
                ct);
        });

        cmd.Add(CreatePullEnvCommand());
        cmd.Add(CreatePullSecretsCommand());
        return cmd;
    }

    private Command CreatePullEnvCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string>("--environment")
        { Description = "Environment type", DefaultValueFactory = _ => "DEVELOPMENT" };
        var vaultGroupsOpt = new Option<string?>("--vault-groups") { Description = "Comma-separated vault group names" };
        var formatOpt = new Option<string>("--format")
        { Description = "Export format (env, appsettings.json, secrets.yaml, config.toml)", DefaultValueFactory = _ => "env" };
        var outputDirOpt = new Option<string>("--output-dir")
        { Description = "Base output directory", DefaultValueFactory = _ => "." };
        var forceOpt = new Option<bool>("--force") { Description = "Overwrite without prompting" };

        var cmd = new Command("env", "Pull only environment variables")
        { projectOpt, envOpt, vaultGroupsOpt, formatOpt, outputDirOpt, forceOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            await ExecutePullAsync(
                parseResult.GetValue(projectOpt),
                parseResult.GetValue(envOpt) ?? "DEVELOPMENT",
                parseResult.GetValue(vaultGroupsOpt),
                parseResult.GetValue(formatOpt) ?? "env",
                false,
                parseResult.GetValue(outputDirOpt) ?? ".",
                parseResult.GetValue(forceOpt),
                ct);
        });

        return cmd;
    }

    private Command CreatePullSecretsCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string>("--environment")
        { Description = "Environment type", DefaultValueFactory = _ => "DEVELOPMENT" };
        var vaultGroupsOpt = new Option<string?>("--vault-groups") { Description = "Comma-separated vault group names" };
        var outputDirOpt = new Option<string>("--output-dir")
        { Description = "Base output directory", DefaultValueFactory = _ => "." };
        var forceOpt = new Option<bool>("--force") { Description = "Overwrite without prompting" };

        var cmd = new Command("secrets", "Pull only secret files")
        { projectOpt, envOpt, vaultGroupsOpt, outputDirOpt, forceOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandHelpers.RequireProjectId(parseResult, projectOpt, configService, output);
            if (projectId is null)
            {
                return;
            }

            var groups = await vaultGroupSelector.SelectAsync(projectId, parseResult.GetValue(vaultGroupsOpt), ct);
            if (groups is null)
            {
                return;
            }

            var outputDir = Path.GetFullPath(parseResult.GetValue(outputDirOpt) ?? ".");

            if (!parseResult.GetValue(forceOpt) && !ConfirmOverwrite(outputDir))
            {
                return;
            }

            AnsiConsole.MarkupLine($"[cyan1]Pulling secret files ({parseResult.GetValue(envOpt) ?? "DEVELOPMENT"})...[/]");
            var count = await secretsPuller.PullAsync(
                projectId, groups, parseResult.GetValue(envOpt) ?? "DEVELOPMENT", outputDir, ct);

            AnsiConsole.WriteLine();
            output.PrintSuccess($"Pulled {count} secret file(s).");
        });

        return cmd;
    }

    private async Task ExecutePullAsync(
        string? projectArg, string envType, string? vaultGroupNames, string format,
        bool includeSecrets, string outputDirArg, bool force, CancellationToken ct)
    {
        if (!authContext.RequireAuth())
        {
            return;
        }

        var projectId = CommandHelpers.RequireProjectId(projectArg, configService, output);
        if (projectId is null)
        {
            return;
        }

        var groups = await vaultGroupSelector.SelectAsync(projectId, vaultGroupNames, ct);
        if (groups is null)
        {
            return;
        }

        var outputDir = Path.GetFullPath(outputDirArg);

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
        output.PrintSuccess($"Pulled {envCount} env file(s) and {secretCount} secret file(s).");
    }

    private bool ConfirmOverwrite(string outputDir)
    {
        if (!prompter.IsInteractive)
        {
            return true;
        }

        var hasExisting = Directory.Exists(outputDir) &&
            Directory.EnumerateFiles(outputDir, ".env*", SearchOption.AllDirectories).Any();

        if (hasExisting)
        {
            return prompter.Confirm("Existing files may be overwritten. Continue?");
        }

        return true;
    }
}
