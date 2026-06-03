using DepVault.Cli.ApiClient.Api.Projects;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;

namespace DepVault.Cli.Services;

/// <summary>Controls which fallbacks the resolver may use when no project is explicitly given.</summary>
[Flags]
public enum ResolutionPolicy
{
    None = 0,

    /// <summary>Match the git repo name against the project list (and persist as active).</summary>
    AllowAutoDetect = 1 << 0,

    /// <summary>Prompt the user to select a project from the list.</summary>
    AllowInteractive = 1 << 1,

    /// <summary>Offer "+ Create new project" in the interactive selector.</summary>
    AllowCreate = 1 << 2,

    /// <summary>Confirm the active project before using it (scan's behavior).</summary>
    ConfirmActive = 1 << 3,

    /// <summary>Auto-detect, then interactive select with create — the push/pull default.</summary>
    Interactive = AllowAutoDetect | AllowInteractive | AllowCreate
}

/// <summary>How the resolved project was obtained — lets callers detect a mismatch.</summary>
public enum ResolutionSource
{
    Explicit,
    Config,
    AutoDetected,
    Created
}

/// <summary>The outcome of project resolution.</summary>
public sealed record ProjectResolution(string ProjectId, ResolutionSource Source, string? ProjectName);

/// <summary>
/// Single entry point for resolving the project a command should act on. Replaces the divergent
/// resolution paths that previously lived in <c>CommandContext</c> (push/pull/read) and the scan-only
/// <c>ProjectResolver</c>. Honors a <see cref="ResolutionPolicy"/> so CI/non-interactive callers
/// never prompt.
/// </summary>
public interface IProjectContextResolver
{
    Task<ProjectResolution?> ResolveAsync(
        string? explicitId, ResolutionPolicy policy, CancellationToken ct);
}

public sealed class ProjectContextResolver(
    IApiClientFactory clientFactory,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IRepositoryLocator repositoryLocator,
    IErrorHandler errorHandler) : IProjectContextResolver
{
    private const string CreateNewLabel = "+ Create new project";

    public async Task<ProjectResolution?> ResolveAsync(
        string? explicitId, ResolutionPolicy policy, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(explicitId))
        {
            return new ProjectResolution(explicitId, ResolutionSource.Explicit, null);
        }

        var config = configService.Load();
        if (!string.IsNullOrEmpty(config.ActiveProjectId))
        {
            // Scan confirms the active project before using it; every other command uses it directly.
            if (policy.HasFlag(ResolutionPolicy.ConfirmActive) && prompter.IsInteractive)
            {
                var confirmed = await TryConfirmActiveAsync(config.ActiveProjectId, ct);
                if (confirmed is not null)
                {
                    return confirmed;
                }
                // Declined or fetch failed → fall through to selection.
            }
            else
            {
                if (policy.HasFlag(ResolutionPolicy.AllowAutoDetect))
                {
                    WarnIfProjectMismatch(config.ActiveProjectName);
                }

                return new ProjectResolution(
                    config.ActiveProjectId, ResolutionSource.Config, config.ActiveProjectName);
            }
        }

        if (policy.HasFlag(ResolutionPolicy.AllowAutoDetect))
        {
            var autoDetected = await TryAutoDetectAsync(ct);
            if (autoDetected is not null)
            {
                return autoDetected;
            }
        }

        if (policy.HasFlag(ResolutionPolicy.AllowInteractive) && prompter.IsInteractive)
        {
            return await SelectInteractiveAsync(policy, ct);
        }

        output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
        return null;
    }

    /// <summary>Fetches the active project and asks to confirm it. Null = declined or fetch failed.</summary>
    private async Task<ProjectResolution?> TryConfirmActiveAsync(string activeId, CancellationToken ct)
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
                return new ProjectResolution(activeId, ResolutionSource.Config, existing.Name);
            }
        }
        catch
        {
            // fall through to selection
        }

        return null;
    }

    /// <summary>Matches the git repo name against the project list and persists it as active.</summary>
    private async Task<ProjectResolution?> TryAutoDetectAsync(CancellationToken ct)
    {
        try
        {
            var repoName = repositoryLocator.GetRepoName();
            if (repoName is null)
            {
                return null;
            }

            var client = clientFactory.Create();
            var result = await client.Api.Projects.GetAsync(c =>
            {
                c.QueryParameters.Page = 1;
                c.QueryParameters.Limit = 100;
            }, ct);

            var match = result?.Items?.FirstOrDefault(p =>
                string.Equals(p.Name, repoName, StringComparison.OrdinalIgnoreCase));

            if (match?.Id is null)
            {
                return null;
            }

            Persist(match.Id, match.Name);
            AnsiConsole.MarkupLine(
                $"[green]Auto-detected project:[/] {Markup.Escape(match.Name ?? match.Id)} [grey](from git remote \"{Markup.Escape(repoName)}\")[/]");
            return new ProjectResolution(match.Id, ResolutionSource.AutoDetected, match.Name);
        }
        catch
        {
            return null;
        }
    }

    private async Task<ProjectResolution?> SelectInteractiveAsync(ResolutionPolicy policy, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var projects = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching projects...", async _ =>
                await client.Api.Projects.GetAsync(c =>
                {
                    c.QueryParameters.Page = 1;
                    c.QueryParameters.Limit = 100;
                }, ct));

        var items = projects?.Items ?? [];
        var allowCreate = policy.HasFlag(ResolutionPolicy.AllowCreate);

        if (items.Count == 0 && !allowCreate)
        {
            output.PrintError("No projects found. Create one in the dashboard or use --project.");
            return null;
        }

        var choices = items.Select(p => p.Name ?? p.Id ?? "Unknown").ToList();
        if (allowCreate)
        {
            choices.Add(CreateNewLabel);
        }

        var selected = prompter.Select("Select a project", choices, c => c);

        if (allowCreate && selected == CreateNewLabel)
        {
            return await CreateProjectAsync(ct);
        }

        var match = items.FirstOrDefault(p => (p.Name ?? p.Id) == selected);
        if (match?.Id is null)
        {
            output.PrintError("Failed to resolve selected project.");
            return null;
        }

        Persist(match.Id, match.Name);
        return new ProjectResolution(match.Id, ResolutionSource.Config, match.Name);
    }

    private async Task<ProjectResolution?> CreateProjectAsync(CancellationToken ct)
    {
        var repoPath = repositoryLocator.FindRepoRoot();
        var defaultName = new DirectoryInfo(repoPath).Name;
        var name = prompter.Ask("Project name", defaultName);
        var repoUrl = await repositoryLocator.GetRemoteUrlAsync(repoPath, ct);
        var client = clientFactory.Create();

        ProjectsPostResponse? created;
        try
        {
            created = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Creating project...", async _ =>
                    await client.Api.Projects.PostAsync(
                        new ProjectsPostRequestBody { Name = name, RepositoryUrl = repoUrl },
                        cancellationToken: ct));
        }
        catch (Exception ex) when (IsConflict(ex))
        {
            return await ResolveConflictAsync(name, ct);
        }
        catch (Exception ex)
        {
            errorHandler.Handle(ex, "Failed to create project");
            return null;
        }

        if (created?.Id is null)
        {
            output.PrintError("Failed to create project.");
            return null;
        }

        Persist(created.Id, name);
        output.PrintSuccess($"Created project '{name}'");

        if (!string.IsNullOrEmpty(repoUrl))
        {
            AnsiConsole.MarkupLine($"[grey]Repository: {Markup.Escape(repoUrl)}[/]");
        }

        return new ProjectResolution(created.Id, ResolutionSource.Created, name);
    }

    /// <summary>
    /// A project with the chosen name already exists (409). Offer to select the existing project
    /// rather than failing the create outright.
    /// </summary>
    private async Task<ProjectResolution?> ResolveConflictAsync(string name, CancellationToken ct)
    {
        try
        {
            var client = clientFactory.Create();
            var result = await client.Api.Projects.GetAsync(c =>
            {
                c.QueryParameters.Page = 1;
                c.QueryParameters.Limit = 100;
            }, ct);

            var existing = result?.Items?.FirstOrDefault(p =>
                string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));

            if (existing?.Id is not null &&
                prompter.Confirm(
                    $"A project named [cyan1]{Markup.Escape(name)}[/] already exists. Use it?"))
            {
                Persist(existing.Id, existing.Name);
                return new ProjectResolution(existing.Id, ResolutionSource.Config, existing.Name);
            }
        }
        catch
        {
            // fall through to the generic error below
        }

        output.PrintError($"A project named '{name}' already exists.");
        return null;
    }

    /// <summary>
    /// Emits a yellow warning when the active project name doesn't match the current repo directory,
    /// so users who switch repos without updating their active project get an early signal.
    /// </summary>
    private void WarnIfProjectMismatch(string? activeProjectName)
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

    private void Persist(string projectId, string? projectName)
    {
        var config = configService.Load();
        config.ActiveProjectId = projectId;
        config.ActiveProjectName = projectName;
        configService.Save(config);
    }

    private static bool IsConflict(Exception ex)
    {
        return ex is ApiException { ResponseStatusCode: 409 }
               || ex.GetType().Name.Contains("409Error", StringComparison.Ordinal);
    }
}
