using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Resolves the project recorded as active in config.</summary>
public interface IActiveProjectResolver
{
    /// <summary>
    /// Returns the active project to use, or null to let the orchestrator fall through to the
    /// remaining strategies. Under <see cref="ResolutionPolicy.ConfirmActive"/> the user is asked
    /// to confirm first; declining (or a failed fetch) returns null.
    /// </summary>
    Task<ProjectResolution?> ResolveAsync(
        string activeId, string? activeName, ResolutionPolicy policy, CancellationToken ct);
}

public sealed class ActiveProjectResolver(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IRepositoryLocator repositoryLocator) : IActiveProjectResolver
{
    public async Task<ProjectResolution?> ResolveAsync(
        string activeId, string? activeName, ResolutionPolicy policy, CancellationToken ct)
    {
        // Scan confirms the active project before using it; every other command uses it directly.
        if (policy.HasFlag(ResolutionPolicy.ConfirmActive) && prompter.IsInteractive)
        {
            return await TryConfirmAsync(activeId, ct);
        }

        if (policy.HasFlag(ResolutionPolicy.AllowAutoDetect))
        {
            WarnIfMismatch(activeName);
        }

        return new ProjectResolution(activeId, activeName);
    }

    /// <summary>Fetches the active project and asks to confirm it. Null = declined or fetch failed.</summary>
    private async Task<ProjectResolution?> TryConfirmAsync(string activeId, CancellationToken ct)
    {
        try
        {
            var client = clientFactory.Create();
            var existing = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Fetching project info...", async _ =>
                    await client.Api.Projects[activeId].GetAsync(cancellationToken: ct));

            if (existing is not null &&
                prompter.Confirm($"Use project [cyan1]{Markup.Escape(existing.Name ?? activeId)}[/]?"))
            {
                return new ProjectResolution(activeId, existing.Name);
            }
        }
        catch
        {
            // fall through to selection
        }

        return null;
    }

    /// <summary>
    /// Emits a yellow warning when the active project name doesn't match the current repo directory,
    /// so users who switch repos without updating their active project get an early signal.
    /// </summary>
    private void WarnIfMismatch(string? activeProjectName)
    {
        if (string.IsNullOrEmpty(activeProjectName))
        {
            return;
        }

        var repoName = repositoryLocator.GetRepoName()
            ?? new DirectoryInfo(repositoryLocator.FindRepoRoot()).Name;

        if (!string.Equals(repoName, activeProjectName, StringComparison.OrdinalIgnoreCase))
        {
            AnsiConsole.MarkupLine(
                $"[yellow]Warning:[/] active project is [cyan1]{Markup.Escape(activeProjectName)}[/] " +
                $"but the current repo is [grey]{Markup.Escape(repoName)}[/]. " +
                $"Run [grey]depvault project[/] to switch.");
        }
    }
}
