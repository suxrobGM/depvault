using DepVault.Cli.Commands.Push;
using DepVault.Cli.EnvFiles;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class EnvFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    DirectoryVaultMapper vaultMapper,
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

        var dirVaultMap = await vaultMapper.MapAsync(projectId, selected, null, false, ct);
        if (dirVaultMap is null)
        {
            return;
        }

        AnsiConsole.WriteLine();
        await PushFilesAsync(projectId, selected, dirVaultMap, results, ct);
    }

    private async Task PushFilesAsync(
        string projectId, List<DiscoveredFile> files,
        Dictionary<string, string> dirVaultMap, ScanResults results, CancellationToken ct)
    {
        foreach (var file in files)
        {
            var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
            if (!dirVaultMap.TryGetValue(dir, out var vaultId))
            {
                AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault)[/]");
                continue;
            }

            try
            {
                var result = await envImporter.ImportAsync(projectId, file, vaultId, ct);
                results.EnvVariablesPushed += result.Imported;
                output.PrintSuccess($"Imported {result.Imported} variables from {file.RelativePath}");
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

    internal static EnvFileFormat DetectEnvFormat(string fileName) =>
        EnvFormat.Detect(fileName);
}
