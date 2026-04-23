using System.CommandLine;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class EnvCommands(CommandContext ctx)
{
    public Command CreateEnvCommand()
    {
        return new Command("env", "Manage environment variables")
        {
            CreateListCommand()
        };
    }

    private Command CreateListCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var vaultIdOpt = new Option<string>("--vault-id")
        { Description = "Vault ID to list variables from" };
        var outputOpt = new Option<string>("--output")
        { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("list", "List environment variables in a vault")
            { projectOpt, vaultIdOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, cancellationToken);
            if (pc is null)
            {
                return;
            }

            var vaultId = parseResult.GetValue(vaultIdOpt);
            if (string.IsNullOrEmpty(vaultId))
            {
                ctx.Output.PrintError("--vault-id is required.");
                return;
            }

            try
            {
                var result = await pc.Client.Api.Projects[pc.ProjectId].Vaults[vaultId].Variables
                    .GetAsync(config =>
                    {
                        config.QueryParameters.Page = 1;
                        config.QueryParameters.Limit = 100;
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
                        { key = v.Key, vaultId = v.VaultId, isRequired = v.IsRequired }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["KEY", "REQUIRED", "UPDATED"],
                    items.Select(v => new[]
                    {
                        v.Key ?? "",
                        v.IsRequired == true ? "yes" : "",
                        v.UpdatedAt?.ToString("yyyy-MM-dd") ?? ""
                    }).ToList());
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to list env vars: {ex.Message}");
            }
        });

        return cmd;
    }
}
