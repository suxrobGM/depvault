using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Finds and deletes environment variables in a vault that are not present in the pushed file.
/// </summary>
internal sealed class StaleVariableCleaner(IApiClientFactory clientFactory, IConsolePrompter prompter)
{
    public async Task<int> CleanAsync(
        string projectId, string vaultId,
        HashSet<string> importedKeys, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var stale = await FindStaleVariablesAsync(client, projectId, vaultId, importedKeys, ct);
        if (stale.Count == 0)
        {
            return 0;
        }

        if (prompter.IsInteractive)
        {
            AnsiConsole.MarkupLine($"[yellow]Found {stale.Count} stale variable(s) to remove:[/]");
            foreach (var (key, _) in stale)
            {
                AnsiConsole.MarkupLine($"  [grey]-[/] {Markup.Escape(key)}");
            }

            if (!prompter.Confirm($"Delete {stale.Count} stale variable(s)?"))
            {
                return 0;
            }
        }

        var deleted = 0;
        foreach (var (key, varId) in stale)
        {
            try
            {
                await client.Api.Projects[projectId].Vaults[vaultId].Variables[varId]
                    .DeleteAsync(cancellationToken: ct);
                deleted++;
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]Failed to delete {Markup.Escape(key)}: {Markup.Escape(ex.Message)}[/]");
            }
        }

        return deleted;
    }

    private static async Task<List<(string Key, string Id)>> FindStaleVariablesAsync(
        ApiClient.ApiClient client, string projectId, string vaultId,
        HashSet<string> importedKeys, CancellationToken ct)
    {
        var stale = new List<(string Key, string Id)>();
        var page = 1;
        const int limit = 100;

        while (true)
        {
            var currentPage = page;
            var result = await client.Api.Projects[projectId].Vaults[vaultId].Variables
                .GetAsync(config =>
                {
                    config.QueryParameters.Page = currentPage;
                    config.QueryParameters.Limit = limit;
                }, ct);

            var items = result?.Items;
            if (items is null || items.Count == 0)
            {
                break;
            }

            foreach (var item in items)
            {
                if (item.Key is not null && item.Id is not null && !importedKeys.Contains(item.Key))
                {
                    stale.Add((item.Key, item.Id));
                }
            }

            var totalPages = (int)(result?.Pagination?.TotalPages ?? 1);
            if (page >= totalPages)
            {
                break;
            }

            page++;
        }

        return stale;
    }
}
