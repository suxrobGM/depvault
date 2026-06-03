using DepVault.Cli.ApiClient.Api.Projects;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Interactive fallback: pick an existing project or create a new one.</summary>
public interface IInteractiveProjectResolver
{
    Task<ProjectResolution?> ResolveAsync(ResolutionPolicy policy, CancellationToken ct);
}

public sealed class InteractiveProjectResolver(
    IApiClientFactory clientFactory,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IRepositoryLocator repositoryLocator,
    IErrorHandler errorHandler) : IInteractiveProjectResolver
{
    private const string CreateNewLabel = "+ Create new project";

    public async Task<ProjectResolution?> ResolveAsync(ResolutionPolicy policy, CancellationToken ct)
    {
        var items = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching projects...", async _ =>
                await ProjectQuery.ListAsync(clientFactory.Create(), ct));

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
            return await CreateAsync(ct);
        }

        var match = items.FirstOrDefault(p => (p.Name ?? p.Id) == selected);
        if (match?.Id is null)
        {
            output.PrintError("Failed to resolve selected project.");
            return null;
        }

        configService.SetActiveProject(match.Id, match.Name);
        return new ProjectResolution(match.Id, match.Name);
    }

    private async Task<ProjectResolution?> CreateAsync(CancellationToken ct)
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

        configService.SetActiveProject(created.Id, name);
        output.PrintSuccess($"Created project '{name}'");

        if (!string.IsNullOrEmpty(repoUrl))
        {
            AnsiConsole.MarkupLine($"[grey]Repository: {Markup.Escape(repoUrl)}[/]");
        }

        return new ProjectResolution(created.Id, name);
    }

    /// <summary>
    /// A project with the chosen name already exists (409). Offer to select the existing project
    /// rather than failing the create outright.
    /// </summary>
    private async Task<ProjectResolution?> ResolveConflictAsync(string name, CancellationToken ct)
    {
        try
        {
            var items = await ProjectQuery.ListAsync(clientFactory.Create(), ct);
            var existing = items.FirstOrDefault(p =>
                string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));

            if (existing?.Id is not null &&
                prompter.Confirm(
                    $"A project named [cyan1]{Markup.Escape(name)}[/] already exists. Use it?"))
            {
                configService.SetActiveProject(existing.Id, existing.Name);
                return new ProjectResolution(existing.Id, existing.Name);
            }
        }
        catch
        {
            // fall through to the generic error below
        }

        output.PrintError($"A project named '{name}' already exists.");
        return null;
    }

    private static bool IsConflict(Exception ex)
    {
        return ex is ApiException { ResponseStatusCode: 409 }
               || ex.GetType().Name.Contains("409Error", StringComparison.Ordinal);
    }
}
