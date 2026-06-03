using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using Spectre.Console;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Matches the git repo name against the project list and persists the match as active.</summary>
public interface IProjectAutoDetector
{
    Task<ProjectResolution?> DetectAsync(CancellationToken ct);
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

            var items = await ProjectQuery.ListAsync(clientFactory.Create(), ct);
            var match = items.FirstOrDefault(p =>
                string.Equals(p.Name, repoName, StringComparison.OrdinalIgnoreCase));

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
}
