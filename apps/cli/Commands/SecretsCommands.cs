using System.CommandLine;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class SecretsCommands(CommandContext ctx)
{
    public Command CreateSecretsCommand()
    {
        return new Command("secrets", "Manage secret files")
        {
            CreateListCommand()
        };
    }

    private Command CreateListCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var envOpt = new Option<string?>("--environment") { Description = "Environment type filter" };
        var outputOpt = new Option<string>("--output")
        { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("list", "List secret file metadata")
            { projectOpt, envOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, cancellationToken);
            if (pc is null)
            {
                return;
            }

            try
            {
                var result = await pc.Client.Api.Projects[pc.ProjectId].Secrets
                    .GetAsync(config =>
                    {
                        config.QueryParameters.Page = 1;
                        config.QueryParameters.Limit = 100;
                    }, cancellationToken);

                var items = result?.Items;
                if (items is null || items.Count == 0)
                {
                    AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
                    return;
                }

                if (parseResult.GetValue(outputOpt) == "json")
                {
                    ctx.Output.PrintJson(items.Select(f => new
                    {
                        id = f.Id,
                        name = f.Name,
                        vaultGroup = f.VaultGroupName,
                        mimeType = f.MimeType,
                        fileSize = f.FileSize
                    }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["NAME", "VAULT GROUP", "TYPE", "SIZE", "UPDATED"],
                    items.Select(f => new[]
                    {
                        f.Name ?? "",
                        f.VaultGroupName ?? "",
                        f.MimeType ?? "",
                        FormatUtils.FileSize(f.FileSize),
                        f.UpdatedAt?.ToString("yyyy-MM-dd") ?? ""
                    }).ToList());
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to list secret files: {ex.Message}");
            }
        });

        return cmd;
    }
}
