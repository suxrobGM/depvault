using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Utils;
using Spectre.Console;
using VarNs = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Variables;

namespace DepVault.Cli.Commands;

public sealed class EnvCommands(
    IApiClientFactory clientFactory,
    CommandContext ctx)
{
    public Command CreateEnvCommand()
    {
        return new Command("env", "Manage environment variables")
        {
            CreateListCommand(),
            CreateDiffCommand()
        };
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
            if (!ctx.RequireAuth())
            {
                return;
            }

            var projectId = ctx.RequireProjectId(parseResult, projectOpt);
            if (projectId is null)
            {
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var result = await client.Api.Projects[projectId].Environments.Variables.GetAsync(config =>
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
                            CommandUtils.ParseEnum(env, VarNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
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
                    ctx.Output.PrintJson(items.Select(v => new
                        { key = v.Key, value = v.Value, environmentId = v.EnvironmentId }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["KEY", "VALUE", "ENVIRONMENT"],
                    items.Select(v => new[] { v.Key ?? "", v.Value ?? "(masked)", v.EnvironmentId ?? "" }).ToList());
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to list env vars: {ex.Message}");
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
            if (!ctx.RequireAuth())
            {
                return;
            }

            var projectId = ctx.RequireProjectId(parseResult, projectOpt);
            if (projectId is null)
            {
                return;
            }

            try
            {
                var envList = parseResult.GetValue(envsOpt)!
                    .Split(',').Select(e => e.Trim().ToUpperInvariant()).ToArray();
                var client = clientFactory.Create();
                var result = await client.Api.Projects[projectId].Environments.Diff.GetAsync(config =>
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
                    ctx.Output.PrintJson(rows.Select(r => new { key = r.Key, status = r.Status?.ToString() }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["KEY", "STATUS"],
                    rows.Select(r => new[] { r.Key ?? "", r.Status?.ToString() ?? "" }).ToList());
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to diff environments: {ex.Message}");
            }
        });

        return cmd;
    }
}
