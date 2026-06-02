using System.CommandLine;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

/// <summary>Lists secret file metadata stored for a project.</summary>
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
        var envOpt = new Option<string?>("--environment") { Description = "Filter by environment slug" };
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

            var envSlug = parseResult.GetValue(envOpt);

            try
            {
                var items = await CollectAllAsync(pc, cancellationToken);

                if (!string.IsNullOrEmpty(envSlug))
                {
                    items = items
                        .Where(f => string.Equals(f.EnvironmentSlug, envSlug, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }

                if (items.Count == 0)
                {
                    AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
                    return;
                }

                if (parseResult.GetValue(outputOpt) == "json")
                {
                    ctx.Output.PrintJson(items.Select(f => new
                    {
                        id = f.Id,
                        appId = f.AppId,
                        app = f.AppName,
                        relativePath = f.RelativePath,
                        environment = f.EnvironmentSlug,
                        mimeType = f.MimeType,
                        fileSize = f.FileSize,
                        isBinary = f.IsBinary
                    }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["PATH", "ENVIRONMENT", "APP", "TYPE", "SIZE", "UPDATED"],
                    items.Select(f => new[]
                    {
                        f.RelativePath ?? "",
                        f.EnvironmentSlug ?? "",
                        f.AppName ?? "",
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

    private static async Task<List<ApiClient.Api.Projects.Item.Secrets.SecretsGetResponse_items>> CollectAllAsync(
        ProjectContext pc, CancellationToken ct)
    {
        var all = new List<ApiClient.Api.Projects.Item.Secrets.SecretsGetResponse_items>();
        var page = 1;

        while (true)
        {
            var currentPage = page;
            var result = await pc.Client.Api.Projects[pc.ProjectId].Secrets
                .GetAsync(config =>
                {
                    config.QueryParameters.Page = currentPage;
                    config.QueryParameters.Limit = 100;
                }, ct);

            if (result?.Items is { Count: > 0 } items)
            {
                all.AddRange(items);
            }
            else
            {
                break;
            }

            var totalPages = result.Pagination?.TotalPages ?? 1;
            if (page >= totalPages)
            {
                break;
            }

            page++;
        }

        return all;
    }
}
