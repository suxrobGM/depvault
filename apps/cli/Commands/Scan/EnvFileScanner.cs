using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class EnvFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    DirectoryVaultGroupMapper dirMapper,
    FileEnvironmentAssigner envAssigner,
    EnvImporter envImporter)
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

        var dirVaultGroupMap = await dirMapper.MapAsync(projectId, selected, ct);
        if (dirVaultGroupMap is null)
        {
            return;
        }

        AnsiConsole.WriteLine();
        var assignments = envAssigner.AssignEnvironments(selected, null);
        await PushFilesAsync(projectId, assignments, dirVaultGroupMap, results, ct);
    }

    private async Task PushFilesAsync(
        string projectId, List<(DiscoveredFile File, string Environment)> assignments,
        Dictionary<string, string> dirVaultGroupMap, ScanResults results, CancellationToken ct)
    {
        foreach (var (file, envType) in assignments)
        {
            var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
            if (!dirVaultGroupMap.TryGetValue(dir, out var vaultGroupId))
            {
                AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                continue;
            }

            try
            {
                var result = await envImporter.ImportAsync(projectId, file, vaultGroupId, envType, ct);
                results.EnvVariablesPushed += result.Imported;
                output.PrintSuccess($"Imported {result.Imported} variables from {file.RelativePath} ({envType})");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
            }
        }
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

    /// <summary>
    ///     Infers environment type from filename. Returns null if the filename
    ///     gives no hint (e.g. plain ".env").
    /// </summary>
    internal static string? DetectEnvironmentType(string fileName)
    {
        var segments = fileName.ToLowerInvariant().Split(['.', '-', '_']);

        foreach (var segment in segments)
        {
            switch (segment)
            {
                case "production" or "prod":
                    return "PRODUCTION";
                case "staging" or "stage":
                    return "STAGING";
                case "development" or "dev":
                    return "DEVELOPMENT";
            }
        }

        return null;
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
