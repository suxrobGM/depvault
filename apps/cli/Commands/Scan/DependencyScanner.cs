using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class DependencyScanner(
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    AnalysisClient analysisClient)
{
    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindDependencyFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No dependency files found.[/]");
            return;
        }

        PrintFileTree(files);

        var selected = prompter.MultiSelect("Select files to analyze", files, f => f.RelativePath);
        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped dependency analysis.[/]");
            return;
        }

        await AnsiConsole.Progress()
            .Columns(new TaskDescriptionColumn(), new ProgressBarColumn(), new SpinnerColumn())
            .StartAsync(async ctx =>
            {
                foreach (var file in selected)
                {
                    var task = ctx.AddTask($"[white]{Markup.Escape(file.RelativePath)}[/]");
                    await AnalyzeSingleFileAsync(projectId, file, task, results, ct);
                }
            });

        PrintHealthTable(results);
    }

    private async Task AnalyzeSingleFileAsync(
        string projectId, DiscoveredFile file, ProgressTask task, ScanResults results, CancellationToken ct)
    {
        var ecosystem = EcosystemResolver.Resolve(file.FileName);
        if (ecosystem is null)
        {
            task.Description = $"[yellow]{Markup.Escape(file.RelativePath)} (unknown ecosystem)[/]";
            task.Value = 100;
            return;
        }

        try
        {
            var content = await File.ReadAllTextAsync(file.FullPath, ct);
            task.Value = 30;

            var result = await analysisClient.AnalyzeFileAsync(projectId, file.FileName, content, ecosystem, ct);

            task.Value = 100;

            if (result is null) return;

            results.FilesAnalyzed++;
            results.TotalDependencies += result.Dependencies.Count;
            results.TotalVulnerabilities += result.TotalVulnerabilities;
            results.HealthScores.Add((file.RelativePath, result.HealthScore));
        }
        catch (Exception ex)
        {
            task.Description = $"[red]{Markup.Escape(file.RelativePath)} (failed: {Markup.Escape(ex.Message)})[/]";
            task.Value = 100;
        }
    }

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} dependency file(s)[/]");
        foreach (var f in files)
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }

    private static void PrintHealthTable(ScanResults results)
    {
        if (results.HealthScores.Count == 0) return;

        AnsiConsole.WriteLine();
        var table = new Table().Border(ConsoleTheme.Border).BorderStyle(new Style(ConsoleTheme.Muted));
        table.AddColumn("[cyan1]FILE[/]");
        table.AddColumn("[cyan1]HEALTH[/]");

        foreach (var (path, score) in results.HealthScores)
        {
            var color = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";
            table.AddRow(Markup.Escape(path), $"[{color}]{score:F0}%[/]");
        }

        AnsiConsole.Write(table);
    }
}
