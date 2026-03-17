using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class SecretLeakScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    ISecretDetector secretDetector)
{
    public void Run(string repoPath, ScanResults results)
    {
        List<SecretDetection>? detections = null;

        AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .Start("Scanning for secret leaks...", _ => { detections = secretDetector.ScanDirectory(repoPath); });

        if (detections is null || detections.Count == 0)
        {
            output.PrintSuccess("No secret leaks detected.");
            return;
        }

        results.SecretLeaksFound = detections.Count;
        PrintDetectionsTable(detections);
        OfferGitignoreUpdate(repoPath, detections);
    }

    private static void PrintDetectionsTable(List<SecretDetection> detections)
    {
        var table = new Table().Border(ConsoleTheme.Border).BorderStyle(new Style(ConsoleTheme.Muted));
        table.AddColumn("[cyan1]FILE[/]");
        table.AddColumn("[cyan1]LINE[/]");
        table.AddColumn("[cyan1]TYPE[/]");
        table.AddColumn("[cyan1]SEVERITY[/]");
        table.AddColumn("[cyan1]MATCH[/]");

        foreach (var d in detections.Take(50))
        {
            var severityColor = d.Severity switch
            {
                SecretSeverity.Critical => "red",
                SecretSeverity.High => "yellow",
                SecretSeverity.Medium => "blue",
                _ => "grey"
            };

            table.AddRow(
                Markup.Escape(d.FilePath),
                d.LineNumber.ToString(),
                Markup.Escape(d.PatternName),
                $"[{severityColor}]{d.Severity}[/]",
                Markup.Escape(d.MatchedSnippet));
        }

        AnsiConsole.Write(table);

        if (detections.Count > 50)
        {
            AnsiConsole.MarkupLine($"[grey]... and {detections.Count - 50} more detections[/]");
        }

        AnsiConsole.WriteLine();
    }

    private void OfferGitignoreUpdate(string repoPath, List<SecretDetection> detections)
    {
        var leakedFiles = detections.Select(d => d.FilePath).Distinct().ToList();

        if (!prompter.Confirm("Add detected files to .gitignore?", false))
        {
            return;
        }

        var gitignorePath = Path.Combine(repoPath, ".gitignore");
        var existingLines = File.Exists(gitignorePath)
            ? new HashSet<string>(File.ReadAllLines(gitignorePath))
            : [];

        var newEntries = leakedFiles
            .Where(f => !existingLines.Contains(f) && !existingLines.Contains(Path.GetFileName(f)))
            .ToList();

        if (newEntries.Count > 0)
        {
            File.AppendAllLines(gitignorePath, ["", "# Secret files detected by depvault scan", .. newEntries]);
            output.PrintSuccess($"Added {newEntries.Count} entries to .gitignore");
        }
        else
        {
            AnsiConsole.MarkupLine("[grey]All detected files already in .gitignore.[/]");
        }
    }
}
