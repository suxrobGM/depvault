using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;
using SecretListNs = DepVault.Cli.ApiClient.Projects.Item.Secrets;

namespace DepVault.Cli.Commands;

public sealed class SecretsCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output)
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
                var result = await client.Projects[projectId].Secrets.GetAsync(config =>
                {
                    var env = parseResult.GetValue(envOpt);
                    if (!string.IsNullOrEmpty(env))
                    {
                        config.QueryParameters.EnvironmentType =
                            CommandHelpers.ParseEnum(env, SecretListNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
                    }

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
                    output.PrintJson(items.Select(f => new
                    {
                        id = f.Id,
                        name = f.Name,
                        vaultGroup = f.VaultGroupName,
                        mimeType = f.MimeType,
                        fileSize = f.FileSize
                    }));
                    return;
                }

                output.PrintTable(
                    ["NAME", "VAULT GROUP", "TYPE", "SIZE", "UPDATED"],
                    items.Select(f => new[]
                    {
                        f.Name ?? "",
                        f.VaultGroupName ?? "",
                        f.MimeType ?? "",
                        FormatFileSize(f.FileSize),
                        f.UpdatedAt?.ToString("yyyy-MM-dd") ?? ""
                    }).ToList());
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to list secret files: {ex.Message}");
            }
        });

        return cmd;
    }

    private static string FormatFileSize(double? bytes)
    {
        if (bytes is null)
        {
            return "";
        }

        return bytes switch
        {
            < 1024 => $"{bytes:F0} B",
            < 1024 * 1024 => $"{bytes / 1024:F1} KB",
            _ => $"{bytes / (1024 * 1024):F1} MB"
        };
    }
}
