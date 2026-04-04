using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;

namespace DepVault.Cli.Commands;

/// <summary>
/// Handles the root command (no subcommand) — prints banner with active project context.
/// </summary>
public sealed class RootHandler(
    CommandContext ctx,
    IApiClientFactory clientFactory,
    ConsoleRenderer renderer)
{
    public void Configure(RootCommand rootCommand)
    {
        rootCommand.SetAction(async (parseResult, cancellationToken) =>
        {
            var config = ctx.Config.Load();
            await ResolveActiveProjectNameAsync(config, cancellationToken);

            renderer.PrintBanner();
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

    private async Task ResolveActiveProjectNameAsync(
        AppConfigData config, CancellationToken cancellationToken)
    {
        if (config.ActiveProjectId is null || config.ActiveProjectName is not null)
        {
            return;
        }

        if (ctx.GetAuthMode() == AuthMode.None)
        {
            return;
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
        }
        catch
        {
            // best-effort
        }
    }
}
