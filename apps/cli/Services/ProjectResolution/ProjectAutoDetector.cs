using DepVault.Cli.ApiClient.Api.Projects;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using Spectre.Console;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Matches the current repo (by remote URL, then name) against the project list.</summary>
public interface IProjectAutoDetector
{
    /// <summary>Detects the project for the current repo and persists it as active, or null.</summary>
    Task<ProjectResolution?> DetectAsync(CancellationToken ct);

    /// <summary>
    /// Re-checks the active project against the current repo and switches to a better match
    /// (by remote URL, then name) when they diverge. Returns the new resolution if switched,
    /// otherwise null to keep the active project.
    /// </summary>
    Task<ProjectResolution?> ReconcileAsync(ProjectResolution active, CancellationToken ct);
}

public sealed class ProjectAutoDetector(
    IApiClientFactory clientFactory,
    IConfigService configService,
    IRepositoryLocator repositoryLocator) : IProjectAutoDetector
{
    public async Task<ProjectResolution?> DetectAsync(CancellationToken ct)
    {
        try
        {
            var repoName = repositoryLocator.GetRepoName();
            if (repoName is null)
            {
                return null;
            }

            var match = await MatchRepoAsync(repoName, ct);
            if (match?.Id is null)
            {
                return null;
            }

            configService.SetActiveProject(match.Id, match.Name);
            AnsiConsole.MarkupLine(
                $"[green]Auto-detected project:[/] {Markup.Escape(match.Name ?? match.Id)} [grey](from git remote \"{Markup.Escape(repoName)}\")[/]");
            return new ProjectResolution(match.Id, match.Name);
        }
        catch
        {
            return null;
        }
    }

    public async Task<ProjectResolution?> ReconcileAsync(ProjectResolution active, CancellationToken ct)
    {
        var repoName = repositoryLocator.GetRepoName();
        if (repoName is null)
        {
            return null; // not a git repo / no remote — keep active, no network
        }

        if (!string.IsNullOrEmpty(active.ProjectName)
            && string.Equals(repoName, active.ProjectName, StringComparison.OrdinalIgnoreCase))
        {
            return null; // fast-path: active already matches the repo
        }

        try
        {
            var match = await MatchRepoAsync(repoName, ct);
            if (match?.Id is null)
            {
                WarnMismatch(active.ProjectName, repoName);
                return null;
            }

            if (string.Equals(match.Id, active.ProjectId, StringComparison.Ordinal))
            {
                // Correct project, name just differs or was unknown (e.g. set via `project select
                // <id>`). Persist the name so the cheap fast-path fires next time, then use it.
                if (string.IsNullOrEmpty(active.ProjectName))
                {
                    configService.SetActiveProject(match.Id, match.Name);
                }

                return null;
            }

            configService.SetActiveProject(match.Id, match.Name);
            AnsiConsole.MarkupLine(
                $"[green]Switched active project to[/] {Markup.Escape(match.Name ?? match.Id)} " +
                $"[grey](matched current repo \"{Markup.Escape(repoName)}\")[/]");
            return new ProjectResolution(match.Id, match.Name);
        }
        catch
        {
            return null; // network/other failure — keep active silently
        }
    }

    /// <summary>Lists the caller's projects and returns the one matching the current repo (URL, then name).</summary>
    private async Task<ProjectsGetResponse_items?> MatchRepoAsync(string repoName, CancellationToken ct)
    {
        var repoUrl = await repositoryLocator.GetRemoteUrlAsync(repositoryLocator.FindRepoRoot(), ct);
        var items = await ProjectQuery.ListAsync(clientFactory.Create(), ct);
        return ProjectMatcher.Match(items, repoUrl, repoName);
    }

    /// <summary>
    /// Falls back to a warning when no project matches the current repo, so users who switched
    /// repos without a corresponding project still get an early signal.
    /// </summary>
    private static void WarnMismatch(string? activeProjectName, string repoName)
    {
        if (string.IsNullOrEmpty(activeProjectName))
        {
            return;
        }

        AnsiConsole.MarkupLine(
            $"[yellow]Warning:[/] active project is [cyan1]{Markup.Escape(activeProjectName)}[/] " +
            $"but the current repo is [grey]{Markup.Escape(repoName)}[/]. " +
            $"Run [grey]depvault project[/] to switch.");
    }
}
