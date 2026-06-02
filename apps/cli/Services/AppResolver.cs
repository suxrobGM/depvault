using DepVault.Cli.ApiClient.Api.Projects.Item.Apps;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Services;

/// <summary>
/// Interactively picks an existing app or creates a new one (the blob-only model groups files
/// under apps rather than vaults).
/// </summary>
public sealed class AppResolver(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    /// <summary>Resolves an app ID, prompting the user to pick an existing app or create one.</summary>
    public async Task<string?> ResolveAsync(string projectId, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var apps = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching apps...", async _ =>
                await client.Api.Projects[projectId].Apps.GetAsync(cancellationToken: ct));

        const string createLabel = "+ Create new app";

        if (apps is not null && apps.Count > 0)
        {
            var choices = apps
                .Select(a => a.Name ?? a.AppPath ?? a.Id ?? "Unknown")
                .Append(createLabel)
                .ToList();

            var selected = prompter.Select("Select app", choices, c => c);

            if (selected != createLabel)
            {
                var match = apps.FirstOrDefault(a => (a.Name ?? a.AppPath ?? a.Id) == selected);
                return match?.Id;
            }
        }

        var name = prompter.Ask("App name", "default");
        var appPath = prompter.Ask("App path (repo-relative)", name);

        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Creating app...", async _ =>
                await client.Api.Projects[projectId].Apps.PostAsync(
                    new AppsPostRequestBody { Name = name, AppPath = appPath }, cancellationToken: ct));

        if (created?.Id is null)
        {
            output.PrintError("Failed to create app.");
            return null;
        }

        output.PrintSuccess($"Created app '{name}'");
        return created.Id;
    }
}
