using DepVault.Cli.ApiClient.Api.Projects.Item.Vaults;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;
using VaultModel = DepVault.Cli.ApiClient.Api.Projects.Item.Vaults.Vaults;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Maps discovered files to vaults by directory and filename hints.
/// Matches existing vaults by directoryPath, tag (from filename), or name.
/// Creates a new vault on demand (in interactive mode, with <c>--create-missing</c>, or when explicit vault name given).
/// </summary>
public sealed class DirectoryVaultMapper(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IOutputFormatter output)
{
    /// <summary>
    /// Groups files by directory and maps each directory to a vault ID.
    /// Returns a dictionary of relative-directory → vault ID, or null on failure.
    /// </summary>
    public async Task<Dictionary<string, string>?> MapAsync(
        string projectId, List<DiscoveredFile> files,
        string? explicitVaultName, bool createMissing, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var existingVaults = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vaults...", async _ =>
                await client.Api.Projects[projectId].Vaults.GetAsync(cancellationToken: ct)) ?? [];

        // Explicit override: every file goes to this named vault, creating if needed.
        if (!string.IsNullOrEmpty(explicitVaultName))
        {
            var vault = existingVaults.FirstOrDefault(v =>
                string.Equals(v.Name, explicitVaultName, StringComparison.OrdinalIgnoreCase));

            if (vault is null)
            {
                vault = await CreateVaultAsync(client, projectId, explicitVaultName!, null, [], ct);
                if (vault?.Id is null)
                {
                    return null;
                }
                existingVaults.Add(vault);
            }

            var map = new Dictionary<string, string>();
            foreach (var group in GroupByDirectory(files))
            {
                map[group.Key] = vault.Id!;
            }
            return map;
        }

        var result = new Dictionary<string, string>();

        foreach (var dirGroup in GroupByDirectory(files))
        {
            var dir = dirGroup.Key;
            var fileNames = string.Join(", ", dirGroup.Select(f => f.FileName));
            AnsiConsole.MarkupLine($"[cyan1]{Markup.Escape(dir)}/[/] [grey]({Markup.Escape(fileNames)})[/]");

            // 1) directoryPath exact match
            var match = existingVaults.FirstOrDefault(v =>
                !string.IsNullOrEmpty(v.DirectoryPath) &&
                string.Equals(v.DirectoryPath, dir, StringComparison.OrdinalIgnoreCase));

            // 2) tag match (from filename → blessed tag)
            if (match is null)
            {
                var fileTags = TagSuggester.SuggestForFiles(dirGroup);
                if (fileTags.Count > 0)
                {
                    match = existingVaults.FirstOrDefault(v =>
                        v.Tags is not null &&
                        fileTags.All(t => v.Tags.Any(vt => string.Equals(vt, t, StringComparison.OrdinalIgnoreCase))));
                }
            }

            // 3) name match (suggested from directory)
            match ??= existingVaults.FirstOrDefault(v =>
                string.Equals(v.Name, SuggestName(dir), StringComparison.OrdinalIgnoreCase));

            if (match?.Id is not null)
            {
                result[dir] = match.Id;
                AnsiConsole.MarkupLine(
                    $"  [grey]vault:[/] [cyan1]{Markup.Escape(match.Name ?? dir)}[/]");
                continue;
            }

            // No match — create it (with confirmation or --create-missing)
            if (!prompter.IsInteractive && !createMissing)
            {
                output.PrintError($"No vault matches '{dir}'. Pass --vault <name> or --create-missing.");
                return null;
            }

            var suggestedName = SuggestName(dir);
            var tags = TagSuggester.SuggestForFiles(dirGroup);
            var name = prompter.IsInteractive
                ? prompter.Ask("  Vault name", suggestedName)
                : suggestedName;

            var created = await CreateVaultAsync(client, projectId, name, dir, tags, ct);
            if (created?.Id is null)
            {
                output.PrintError($"Failed to create vault for {dir}. Skipping.");
                continue;
            }

            output.PrintSuccess($"  Created vault '{name}'");
            result[dir] = created.Id;
            existingVaults.Add(created);
        }

        return result;
    }

    private static async Task<VaultModel?> CreateVaultAsync(
        ApiClient.ApiClient client, string projectId, string name,
        string? directoryPath, List<string> tags, CancellationToken ct)
    {
        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Creating vault '{name}'...", async _ =>
                await client.Api.Projects[projectId].Vaults.PostAsync(
                    new VaultsPostRequestBody
                    {
                        Name = name,
                        DirectoryPath = directoryPath,
                        Tags = tags,
                    },
                    cancellationToken: ct));

        if (created is null)
        {
            return null;
        }

        return new VaultModel
        {
            Id = created.Id,
            Name = created.Name,
            DirectoryPath = created.DirectoryPath,
            Tags = created.Tags,
        };
    }

    private static IEnumerable<IGrouping<string, DiscoveredFile>> GroupByDirectory(List<DiscoveredFile> files)
    {
        return files.GroupBy(f => Path.GetDirectoryName(f.RelativePath)?.Replace('\\', '/') ?? ".");
    }

    internal static string SuggestName(string directory)
    {
        if (string.IsNullOrEmpty(directory) || directory == ".")
        {
            return "default";
        }

        var parts = directory.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return parts[^1];
    }
}
