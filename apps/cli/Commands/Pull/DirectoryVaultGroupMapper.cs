using DepVault.Cli.ApiClient.Projects.Item.VaultGroups;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;
using VaultGroupsModel = DepVault.Cli.ApiClient.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Pull;

/// <summary>
/// Maps discovered files to vault groups by directory.
/// Matches existing vault groups by directoryPath or name, creates new ones if needed.
/// </summary>
public sealed class DirectoryVaultGroupMapper(
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    IOutputFormatter output)
{
    /// <summary>
    /// Groups files by directory and maps each directory to a vault group ID.
    /// Returns a dictionary of directory → vault group ID, or null on failure.
    /// </summary>
    public async Task<Dictionary<string, string>?> MapAsync(
        string projectId, List<DiscoveredFile> files, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var existingGroups = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct)) ?? [];

        var map = new Dictionary<string, string>();

        var filesByDir = files
            .GroupBy(f => Path.GetDirectoryName(f.RelativePath)?.Replace('\\', '/') ?? ".")
            .ToList();

        foreach (var dirGroup in filesByDir)
        {
            var dir = dirGroup.Key;
            var fileList = string.Join(", ", dirGroup.Select(f => f.FileName));
            AnsiConsole.MarkupLine($"[cyan1]{Markup.Escape(dir)}/[/] [grey]({Markup.Escape(fileList)})[/]");

            // Try matching by directoryPath first, then by suggested name
            var match = existingGroups.FirstOrDefault(g =>
                !string.IsNullOrEmpty(g.DirectoryPath) &&
                string.Equals(g.DirectoryPath, dir, StringComparison.OrdinalIgnoreCase));

            match ??= existingGroups.FirstOrDefault(g =>
                string.Equals(g.Name, SuggestName(dir), StringComparison.OrdinalIgnoreCase));

            if (match?.Id is not null)
            {
                map[dir] = match.Id;
                AnsiConsole.MarkupLine(
                    $"  [grey]vault group:[/] [cyan1]{Markup.Escape(match.Name ?? dir)}[/]");
                continue;
            }

            if (!prompter.IsInteractive)
            {
                output.PrintError($"No vault group found for '{dir}'. Create one first or use --vault-group.");
                return null;
            }

            var name = prompter.Ask("  Vault group name", SuggestName(dir));
            var created = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync($"Creating vault group '{name}'...", async _ =>
                    await client.Projects[projectId].VaultGroups.PostAsync(
                        new VaultGroupsPostRequestBody { Name = name, DirectoryPath = dir },
                        cancellationToken: ct));

            if (created?.Id is null)
            {
                output.PrintError($"Failed to create vault group for {dir}. Skipping.");
                continue;
            }

            output.PrintSuccess($"  Created vault group '{name}'");
            map[dir] = created.Id;
            existingGroups.Add(new VaultGroupsModel { Id = created.Id, Name = created.Name, DirectoryPath = dir });
        }

        return map;
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
