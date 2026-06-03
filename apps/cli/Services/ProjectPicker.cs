using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Services;

/// <summary>Outcome of <see cref="IProjectPicker.PickActiveAsync"/>.</summary>
public abstract record ProjectPick;

public sealed record ProjectSelected(string Id, string? Name) : ProjectPick;

/// <summary>Returned only when <c>includeCreateNew</c> is requested and the user chose it.</summary>
public sealed record ProjectCreateNew : ProjectPick;

public interface IProjectPicker
{
    /// <summary>
    /// Fetches the user's projects and runs an interactive single-select. Returns the chosen project,
    /// <see cref="ProjectCreateNew"/> (when <paramref name="includeCreateNew"/> is set), or null when
    /// there is nothing to pick. Esc throws <see cref="PromptCanceledException"/> for the caller to handle.
    /// </summary>
    Task<ProjectPick?> PickActiveAsync(bool includeCreateNew, CancellationToken ct);
}

public sealed class ProjectPicker(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IConfigService configService) : IProjectPicker
{
    public async Task<ProjectPick?> PickActiveAsync(bool includeCreateNew, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var result = await client.Api.Projects.GetAsync(config =>
        {
            config.QueryParameters.Page = 1;
            config.QueryParameters.Limit = 100;
        }, ct);

        var activeId = configService.Load().ActiveProjectId;

        var choices = new List<Choice>();
        if (includeCreateNew)
        {
            choices.Add(Choice.CreateNew());
        }

        choices.AddRange((result?.Items ?? [])
            .Where(p => p.Id is not null)
            .Select(p => new Choice(p.Id, p.Name)));

        if (choices.Count == 0)
        {
            return null;
        }

        var selected = prompter.Select(
            "Select active project",
            choices,
            c =>
            {
                if (c.IsCreateNew)
                {
                    return "[cyan1]+ Create new project[/]";
                }

                var marker = c.Id == activeId ? " [green]*[/]" : "";
                return $"{Markup.Escape(c.Name ?? "")}{marker}";
            });

        return selected.IsCreateNew
            ? new ProjectCreateNew()
            : new ProjectSelected(selected.Id!, selected.Name);
    }

    private sealed record Choice(string? Id, string? Name)
    {
        public bool IsCreateNew => Id is null;
        public static Choice CreateNew() => new(null, null);
    }
}
