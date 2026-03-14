using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands;

internal static class CommandHelpers
{
    /// <summary>Resolves project ID from CLI option or active config. Prints error and returns null on failure.</summary>
    public static string? RequireProjectId(ParseResult parseResult, Option<string?> projectOpt,
        IConfigService configService, IOutputFormatter output)
    {
        var projectId = parseResult.GetValue(projectOpt) ?? configService.Load().ActiveProjectId;
        if (string.IsNullOrEmpty(projectId))
        {
            output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
            return null;
        }

        return projectId;
    }

    /// <summary>Interactive project resolution — prompts user to select or create a project when none specified.</summary>
    public static async Task<string?> RequireProjectIdInteractive(
        ParseResult parseResult,
        Option<string?> projectOpt,
        IConfigService configService,
        IApiClientFactory clientFactory,
        IConsolePrompter prompter,
        IOutputFormatter output,
        CancellationToken ct)
    {
        var projectId = parseResult.GetValue(projectOpt);
        if (!string.IsNullOrEmpty(projectId))
        {
            return projectId;
        }

        var config = configService.Load();
        if (!string.IsNullOrEmpty(config.ActiveProjectId))
        {
            return config.ActiveProjectId;
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
            return null;
        }

        var client = clientFactory.Create();
        var projects = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching projects...", async _ =>
                await client.Projects.GetAsync(c =>
                {
                    c.QueryParameters.Page = 1;
                    c.QueryParameters.Limit = 100;
                }, ct));

        var items = projects?.Items;
        if (items is null || items.Count == 0)
        {
            output.PrintError("No projects found. Create one first with 'depvault scan' or via the web app.");
            return null;
        }

        var selected = prompter.Select(
            "Select a project",
            items,
            p => p.Name ?? p.Id ?? "Unknown");

        if (selected.Id is not null)
        {
            config.ActiveProjectId = selected.Id;
            configService.Save(config);
        }

        return selected.Id;
    }

    /// <summary>Checks file exists and prints error if not. Returns false on failure.</summary>
    public static bool RequireFile(string path, IOutputFormatter output)
    {
        if (File.Exists(path))
        {
            return true;
        }

        output.PrintError($"File not found: {path}");
        return false;
    }

    /// <summary>Parses a Kiota-generated enum by member name, returning fallback on mismatch.</summary>
    public static T ParseEnum<T>(string value, T fallback) where T : struct, Enum
    {
        return Enum.TryParse<T>(value, true, out var result) ? result : fallback;
    }
}
