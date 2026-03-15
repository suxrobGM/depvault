using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;
using VaultGroupsModel = DepVault.Cli.ApiClient.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Fetches vault groups and lets the user multi-select which ones to use.</summary>
public sealed class VaultGroupSelector(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IOutputFormatter output)
{
    /// <summary>
    /// Fetches all vault groups for the project. If <paramref name="vaultGroupNames"/> is provided,
    /// filters by name; otherwise prompts interactively or returns all.
    /// </summary>
    public async Task<List<VaultGroupsModel>?> SelectAsync(
        string projectId, string? vaultGroupNames, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var allGroups = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct));

        if (allGroups is null || allGroups.Count == 0)
        {
            output.PrintError("No vault groups found for this project.");
            return null;
        }

        if (!string.IsNullOrEmpty(vaultGroupNames))
        {
            return MatchByName(allGroups, vaultGroupNames);
        }

        if (prompter.IsInteractive)
        {
            var selected = prompter.MultiSelect("Select vault groups to pull", allGroups, g => g.Name ?? "Unknown");
            return selected.Count > 0 ? selected : null;
        }

        return allGroups;
    }

    private List<VaultGroupsModel>? MatchByName(List<VaultGroupsModel> groups, string names)
    {
        var requested = names.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var matched = new List<VaultGroupsModel>();

        foreach (var name in requested)
        {
            var match = groups.FirstOrDefault(g =>
                string.Equals(g.Name, name, StringComparison.OrdinalIgnoreCase));

            if (match is null)
            {
                var available = string.Join(", ", groups.Select(g => g.Name));
                output.PrintError($"Vault group '{name}' not found. Available: {available}");
                return null;
            }

            matched.Add(match);
        }

        return matched;
    }
}
