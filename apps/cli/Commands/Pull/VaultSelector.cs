using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;
using VaultModel = DepVault.Cli.ApiClient.Api.Projects.Item.Vaults.Vaults;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Fetches project vaults and lets the user filter or multi-select interactively.</summary>
public sealed class VaultSelector(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IOutputFormatter output)
{
    /// <summary>
    /// Fetches every vault for the project. Filters by comma-separated names if <paramref name="vaultNames"/>
    /// is set, or by tag intersection if <paramref name="tagFilter"/> is set. Otherwise prompts interactively.
    /// </summary>
    public async Task<List<VaultModel>?> SelectAsync(
        string projectId, string? vaultNames, string? tagFilter, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var allVaults = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vaults...", async _ =>
                await client.Api.Projects[projectId].Vaults.GetAsync(cancellationToken: ct));

        if (allVaults is null || allVaults.Count == 0)
        {
            output.PrintError("No vaults found for this project.");
            return null;
        }

        if (!string.IsNullOrEmpty(vaultNames))
        {
            return MatchByName(allVaults, vaultNames);
        }

        if (!string.IsNullOrEmpty(tagFilter))
        {
            var filtered = MatchByTags(allVaults, tagFilter);
            if (filtered.Count == 0)
            {
                output.PrintError($"No vaults match tag filter: {tagFilter}");
                return null;
            }
            return filtered;
        }

        if (prompter.IsInteractive)
        {
            var selected = prompter.MultiSelect(
                "Select vaults to pull", allVaults, v => FormatLabel(v));
            return selected.Count > 0 ? selected : null;
        }

        return allVaults;
    }

    private List<VaultModel>? MatchByName(List<VaultModel> vaults, string names)
    {
        var requested = names.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var matched = new List<VaultModel>();

        foreach (var name in requested)
        {
            var match = vaults.FirstOrDefault(v =>
                string.Equals(v.Name, name, StringComparison.OrdinalIgnoreCase));

            if (match is null)
            {
                var available = string.Join(", ", vaults.Select(v => v.Name));
                output.PrintError($"Vault '{name}' not found. Available: {available}");
                return null;
            }

            matched.Add(match);
        }

        return matched;
    }

    /// <summary>Returns vaults whose tag set is a superset of every requested tag (comma-separated).</summary>
    private static List<VaultModel> MatchByTags(List<VaultModel> vaults, string tagFilter)
    {
        var requested = tagFilter
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToLowerInvariant())
            .ToHashSet();

        return vaults.Where(v =>
        {
            var vaultTags = (v.Tags ?? []).Select(t => t.ToLowerInvariant()).ToHashSet();
            return requested.All(vaultTags.Contains);
        }).ToList();
    }

    private static string FormatLabel(VaultModel v)
    {
        var name = Markup.Escape(v.Name ?? "Unknown");
        if (v.Tags is not null && v.Tags.Count > 0)
        {
            var tags = string.Join(" ", v.Tags.Select(t => $"#{Markup.Escape(t)}"));
            return $"{name} [grey]{tags}[/]";
        }
        return name;
    }
}
