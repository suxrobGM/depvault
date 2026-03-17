using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;

namespace DepVault.Cli.Commands;

/// <summary>
/// Handles the root command (no subcommand) — prints banner with active project context.
/// </summary>
public sealed class RootHandler(CommandContext ctx, IApiClientFactory clientFactory)
{
    public void Configure(RootCommand rootCommand)
    {
        rootCommand.SetAction(async (parseResult, cancellationToken) =>
        {
            var config = ctx.Config.Load();
            var projectName = await ResolveActiveProjectNameAsync(config, cancellationToken);

            ConsoleTheme.PrintBanner(projectName, config.ActiveProjectId);
            Console.WriteLine(rootCommand.Description);
            Console.WriteLine();
            Console.WriteLine("Usage: depvault [command] [options]");
            Console.WriteLine();
            Console.WriteLine("Commands:");
            foreach (var sub in rootCommand.Subcommands)
            {
                Console.WriteLine($"  {sub.Name,-16} {sub.Description}");
            }
        });
    }

    private async Task<string?> ResolveActiveProjectNameAsync(
        AppConfigData config, CancellationToken cancellationToken)
    {
        if (config.ActiveProjectId is null)
        {
            return null;
        }

        if (config.ActiveProjectName is not null)
        {
            return config.ActiveProjectName;
        }

        if (ctx.GetAuthMode() == AuthMode.None)
        {
            return null;
        }

        try
        {
            var apiClient = clientFactory.Create();
            var project = await apiClient.Api.Projects[config.ActiveProjectId]
                .GetAsync(cancellationToken: cancellationToken);

            if (project?.Name is not null)
            {
                config.ActiveProjectName = project.Name;
                ctx.Config.Save(config);
            }

            return project?.Name;
        }
        catch
        {
            return null;
        }
    }
}
