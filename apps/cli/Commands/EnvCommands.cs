using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Common;
using Spectre.Console;
using GetKind = DepVault.Cli.ApiClient.Api.Projects.Item.Files.GetKindQueryParameterType;

namespace DepVault.Cli.Commands;

/// <summary>Lists config files (env/appsettings/etc.) stored for a project.</summary>
public sealed class EnvCommands(
    AuthContext ctx,
    IProjectContextResolver projectContextResolver,
    IApiClientFactory clientFactory,
    ConsoleRenderer renderer)
{
    public Command CreateEnvCommand()
    {
        return new Command("env", "Manage environment & config files")
        {
            CreateListCommand()
        };
    }

    private Command CreateListCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var appOpt = new Option<string?>("--app") { Description = "Filter by app ID" };
        var envOpt = new Option<string?>("--environment") { Description = "Filter by environment slug" };
        var outputOpt = new Option<string>("--output")
        { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("list", "List config files in a project")
            { projectOpt, appOpt, envOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var resolution = await projectContextResolver.ResolveAsync(
                parseResult.GetValue(projectOpt),
                ResolutionPolicy.AllowAutoDetect | ResolutionPolicy.AllowInteractive,
                cancellationToken);
            if (resolution is null)
            {
                return;
            }

            renderer.PrintStatusLine();
            var projectId = resolution.ProjectId;
            var client = clientFactory.Create();

            var appId = parseResult.GetValue(appOpt);
            var envSlug = parseResult.GetValue(envOpt);

            try
            {
                var result = await client.Api.Projects[projectId].Files
                    .GetAsync(config =>
                    {
                        config.QueryParameters.Page = 1;
                        config.QueryParameters.Limit = 100;
                        config.QueryParameters.Kind = GetKind.CONFIG;
                        if (!string.IsNullOrEmpty(appId))
                        {
                            config.QueryParameters.AppId = appId;
                        }

                        if (!string.IsNullOrEmpty(envSlug))
                        {
                            config.QueryParameters.EnvironmentSlug = envSlug;
                        }
                    }, cancellationToken);

                var items = result?.Items;
                if (items is null || items.Count == 0)
                {
                    AnsiConsole.MarkupLine("[grey]No config files found.[/]");
                    return;
                }

                if (parseResult.GetValue(outputOpt) == "json")
                {
                    ctx.Output.PrintJson(items.Select(f => new
                    {
                        id = f.Id,
                        appId = f.AppId,
                        relativePath = f.RelativePath,
                        environment = f.EnvironmentSlug,
                        format = f.Format,
                        fileSize = f.FileSize,
                        isBinary = f.IsBinary
                    }));
                    return;
                }

                ctx.Output.PrintTable(
                    ["PATH", "ENVIRONMENT", "FORMAT", "SIZE", "UPDATED"],
                    items.Select(f => new[]
                    {
                        f.RelativePath ?? "",
                        f.EnvironmentSlug ?? "",
                        f.Format ?? "",
                        FormatUtils.FileSize(f.FileSize),
                        f.UpdatedAt?.ToString("yyyy-MM-dd") ?? ""
                    }).ToList());
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to list config files: {ex.Message}");
            }
        });

        return cmd;
    }
}
