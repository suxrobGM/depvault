using DepVault.Cli.ApiClient.Projects.Item.VaultGroups;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Import;
using VaultGroupsModel = DepVault.Cli.ApiClient.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Scan;

internal sealed class EnvFileScanner(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner)
{
    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindEnvFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No environment files found.[/]");
            return;
        }

        PrintFileTree(files);

        AnsiConsole.MarkupLine("[yellow]Warning: These files may contain sensitive data. Review before pushing.[/]");
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to push (none selected by default)", files, f => f.RelativePath, false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped environment file push.[/]");
            return;
        }

        var client = clientFactory.Create();
        var existingGroups = await FetchVaultGroupsAsync(client, projectId, ct);
        var dirVaultGroupMap = await MapDirectoriesToVaultGroups(client, projectId, selected, existingGroups, ct);

        AnsiConsole.WriteLine();
        await PushFilesAsync(client, projectId, selected, dirVaultGroupMap, results, ct);
    }

    private async Task<List<VaultGroupsModel>> FetchVaultGroupsAsync(
        ApiClient.ApiClient client, string projectId, CancellationToken ct)
    {
        return await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct)) ?? [];
    }

    private async Task<Dictionary<string, string>> MapDirectoriesToVaultGroups(
        ApiClient.ApiClient client, string projectId, List<DiscoveredFile> selected,
        List<VaultGroupsModel> existingGroups, CancellationToken ct)
    {
        var map = new Dictionary<string, string>();

        var filesByDir = selected
            .GroupBy(f => Path.GetDirectoryName(f.RelativePath)?.Replace('\\', '/') ?? ".")
            .ToList();

        foreach (var dirGroup in filesByDir)
        {
            var dir = dirGroup.Key;
            var suggestedName = SuggestVaultGroupName(dir);
            var fileList = string.Join(", ", dirGroup.Select(f => f.FileName));

            AnsiConsole.MarkupLine($"[cyan1]{Markup.Escape(dir)}/[/] [grey]({Markup.Escape(fileList)})[/]");

            var existingMatch = existingGroups.FirstOrDefault(g =>
                string.Equals(g.Name, suggestedName, StringComparison.OrdinalIgnoreCase));

            if (existingMatch?.Id is not null)
            {
                map[dir] = existingMatch.Id;
                AnsiConsole.MarkupLine(
                    $"  [grey]→ vault group:[/] [cyan1]{Markup.Escape(existingMatch.Name ?? suggestedName)}[/]");
                continue;
            }

            var name = prompter.Ask("  Vault group name", suggestedName);
            var created = await CreateVaultGroupAsync(client, projectId, name, ct);

            if (created?.Id is null)
            {
                output.PrintError($"Failed to create vault group for {dir}. Skipping.");
                continue;
            }

            output.PrintSuccess($"Created vault group '{name}'");
            map[dir] = created.Id;
            existingGroups.Add(new VaultGroupsModel { Id = created.Id, Name = created.Name });
        }

        return map;
    }

    private async Task PushFilesAsync(
        ApiClient.ApiClient client, string projectId, List<DiscoveredFile> files,
        Dictionary<string, string> dirVaultGroupMap, ScanResults results, CancellationToken ct)
    {
        foreach (var file in files)
        {
            var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
            if (!dirVaultGroupMap.TryGetValue(dir, out var vaultGroupId))
            {
                AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                continue;
            }

            var envType = DetectEnvironmentType(file.FileName);
            var format = DetectEnvFormat(file.FileName);

            try
            {
                var content = await File.ReadAllTextAsync(file.FullPath, ct);

                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                        await client.Projects[projectId].Environments.Import.PostAsync(
                            new ImportNs.ImportPostRequestBody
                            {
                                Content = content,
                                VaultGroupId = vaultGroupId,
                                EnvironmentType = CommandHelpers.ParseEnum(envType,
                                    ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                                Format = CommandHelpers.ParseEnum(format, ImportNs.ImportPostRequestBody_format.Env)
                            }, cancellationToken: ct));

                results.EnvVariablesPushed += (int)(result?.Imported ?? 0);
                output.PrintSuccess($"Imported {(int)(result?.Imported ?? 0)} variables from {file.RelativePath}");
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to push {file.RelativePath}: {ex.Message}");
            }
        }
    }

    private static async Task<VaultGroupsPostResponse?> CreateVaultGroupAsync(
        ApiClient.ApiClient client, string projectId, string name, CancellationToken ct)
    {
        return await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Creating vault group '{name}'...", async _ =>
                await client.Projects[projectId].VaultGroups.PostAsync(
                    new VaultGroupsPostRequestBody { Name = name }, cancellationToken: ct));
    }

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} environment file(s)[/]");
        foreach (var f in files)
        {
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }

    internal static string SuggestVaultGroupName(string directory)
    {
        if (string.IsNullOrEmpty(directory) || directory == ".")
        {
            return "default";
        }

        var parts = directory.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return parts[^1];
    }

    internal static string DetectEnvironmentType(string fileName)
    {
        var lower = fileName.ToLowerInvariant();
        if (lower.Contains("production") || lower.Contains("prod"))
        {
            return "PRODUCTION";
        }

        if (lower.Contains("staging") || lower.Contains("stage"))
        {
            return "STAGING";
        }

        return "DEVELOPMENT";
    }

    internal static string DetectEnvFormat(string fileName)
    {
        if (fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            return "appsettings.json";
        }

        if (fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase))
        {
            return "secrets.yaml";
        }

        if (fileName.EndsWith(".toml", StringComparison.OrdinalIgnoreCase))
        {
            return "config.toml";
        }

        return "env";
    }
}
