using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Env;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;
using ExportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Export;
using ImportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Import;
using VarNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Variables;

namespace DepVault.Cli.Commands;

public sealed class EnvCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    VaultGroupResolver vaultGroupResolver)
{
    public Command CreateEnvCommand()
    {
        return new Command("env", "Manage environment variables")
        {
            CreatePullCommand(),
            CreatePushCommand(),
            CreateListCommand(),
            CreateDiffCommand()
        };
    }

    private Command CreatePullCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var vaultGroupOpt = new Option<string?>("--vault-group") { Description = "Vault group ID" };
        var envOpt = new Option<string>("--environment")
            { Description = "Environment type", DefaultValueFactory = _ => "DEVELOPMENT" };
        var formatOpt = new Option<string>("--format")
        {
            Description = "Export format (env, appsettings.json, secrets.yaml, config.toml)",
            DefaultValueFactory = _ => "env"
        };
        var outputOpt = new Option<string?>("--output") { Description = "Output file path (defaults to stdout)" };

        var cmd = new Command("pull", "Export environment variables to local file")
            { projectOpt, vaultGroupOpt, envOpt, formatOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
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

            var vaultGroupId = parseResult.GetValue(vaultGroupOpt);
            var env = parseResult.GetValue(envOpt) ?? "DEVELOPMENT";
            var format = parseResult.GetValue(formatOpt) ?? "env";

            try
            {
                var client = clientFactory.Create();
                var result = await client.Projects[projectId].Environments.Export.GetAsync(config =>
                {
                    config.QueryParameters.EnvironmentType =
                        CommandHelpers.ParseEnum(env, ExportNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
                    config.QueryParameters.Format =
                        CommandHelpers.ParseEnum(format, ExportNs.GetFormatQueryParameterType.Env);
                    if (!string.IsNullOrEmpty(vaultGroupId))
                    {
                        config.QueryParameters.VaultGroupId = vaultGroupId;
                    }
                }, cancellationToken);

                output.WriteContent(result?.Content ?? "", parseResult.GetValue(outputOpt));
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to pull env vars: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreatePushCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var vaultGroupOpt = new Option<string?>("--vault-group")
            { Description = "Vault group ID (prompts interactively if omitted)" };
        var envOpt = new Option<string>("--environment")
            { Description = "Environment type", DefaultValueFactory = _ => "DEVELOPMENT" };
        var formatOpt = new Option<string>("--format")
            { Description = "Import format", DefaultValueFactory = _ => "env" };
        var fileOpt = new Option<string?>("--file") { Description = "File to import (auto-detects if omitted)" };

        var cmd = new Command("push", "Import environment variables from local file")
            { projectOpt, vaultGroupOpt, envOpt, formatOpt, fileOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
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

            var filePath = CommandHelpers.ResolveFileInteractive(
                parseResult, fileOpt, prompter, output,
                () => fileScanner.FindEnvFiles(Directory.GetCurrentDirectory()),
                "environment");
            if (filePath is null)
            {
                return;
            }

            var vaultGroupId = await ResolveVaultGroupId(parseResult, vaultGroupOpt, projectId, cancellationToken);
            if (vaultGroupId is null)
            {
                return;
            }

            try
            {
                var content = await File.ReadAllTextAsync(filePath, cancellationToken);
                var envValue = parseResult.GetValue(envOpt) ?? "DEVELOPMENT";
                var formatValue = parseResult.GetValue(formatOpt) ?? "env";
                var client = clientFactory.Create();

                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync("Pushing environment variables...", async _ =>
                        await client.Projects[projectId].Environments.Import.PostAsync(
                            new ImportNs.ImportPostRequestBody
                            {
                                Content = content,
                                VaultGroupId = vaultGroupId,
                                EnvironmentType = CommandHelpers.ParseEnum(envValue,
                                    ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                                Format = CommandHelpers.ParseEnum(formatValue,
                                    ImportNs.ImportPostRequestBody_format.Env)
                            }, cancellationToken: cancellationToken));

                output.PrintSuccess($"Imported {result?.Imported ?? 0} variables.");
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to push env vars: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreateListCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var vaultGroupOpt = new Option<string?>("--vault-group") { Description = "Vault group ID" };
        var envOpt = new Option<string?>("--environment") { Description = "Environment type" };
        var outputOpt = new Option<string>("--output")
            { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("list", "List environment variables")
            { projectOpt, vaultGroupOpt, envOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
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

            try
            {
                var client = clientFactory.Create();
                var result = await client.Projects[projectId].Environments.Variables.GetAsync(config =>
                {
                    var vgId = parseResult.GetValue(vaultGroupOpt);
                    if (!string.IsNullOrEmpty(vgId))
                    {
                        config.QueryParameters.VaultGroupId = vgId;
                    }

                    var env = parseResult.GetValue(envOpt);
                    if (!string.IsNullOrEmpty(env))
                    {
                        config.QueryParameters.EnvironmentType =
                            CommandHelpers.ParseEnum(env, VarNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
                    }
                }, cancellationToken);

                var items = result?.Items;
                if (items is null || items.Count == 0)
                {
                    AnsiConsole.MarkupLine("[grey]No variables found.[/]");
                    return;
                }

                if (parseResult.GetValue(outputOpt) == "json")
                {
                    output.PrintJson(items.Select(v => new
                        { key = v.Key, value = v.Value, environmentId = v.EnvironmentId }));
                    return;
                }

                output.PrintTable(
                    ["KEY", "VALUE", "ENVIRONMENT"],
                    items.Select(v => new[] { v.Key ?? "", v.Value ?? "(masked)", v.EnvironmentId ?? "" }).ToList());
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to list env vars: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreateDiffCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var vaultGroupOpt = new Option<string>("--vault-group") { Description = "Vault group ID", Required = true };
        var envsOpt = new Option<string>("--environments")
            { Description = "Comma-separated environment types", Required = true };
        var outputOpt = new Option<string>("--output")
            { Description = "Output format", DefaultValueFactory = _ => "table" };

        var cmd = new Command("diff", "Compare environment variables across environments")
            { projectOpt, vaultGroupOpt, envsOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
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

            try
            {
                var envList = parseResult.GetValue(envsOpt)!
                    .Split(',').Select(e => e.Trim().ToUpperInvariant()).ToArray();
                var client = clientFactory.Create();
                var result = await client.Projects[projectId].Environments.Diff.GetAsync(config =>
                {
                    config.QueryParameters.VaultGroupId = parseResult.GetValue(vaultGroupOpt);
                    config.QueryParameters.Environments = string.Join(",", envList);
                }, cancellationToken);

                var rows = result?.Rows;
                if (rows is null || rows.Count == 0)
                {
                    AnsiConsole.MarkupLine("[grey]No differences found.[/]");
                    return;
                }

                if (parseResult.GetValue(outputOpt) == "json")
                {
                    output.PrintJson(rows.Select(r => new { key = r.Key, status = r.Status?.ToString() }));
                    return;
                }

                output.PrintTable(
                    ["KEY", "STATUS"],
                    rows.Select(r => new[] { r.Key ?? "", r.Status?.ToString() ?? "" }).ToList());
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to diff environments: {ex.Message}");
            }
        });

        return cmd;
    }

    private async Task<string?> ResolveVaultGroupId(
        ParseResult parseResult, Option<string?> vaultGroupOpt, string projectId, CancellationToken ct)
    {
        var vaultGroupId = parseResult.GetValue(vaultGroupOpt);
        if (!string.IsNullOrEmpty(vaultGroupId))
        {
            return vaultGroupId;
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("--vault-group is required in non-interactive mode.");
            return null;
        }

        return await vaultGroupResolver.ResolveAsync(projectId, ct);
    }
}
