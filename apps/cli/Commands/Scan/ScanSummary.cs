using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal static class ScanSummary
{
    public static void Print(ScanResults results)
    {
        var table = new Table()
            .Border(ConsoleTheme.Border)
            .BorderStyle(new Style(ConsoleTheme.Brand))
            .Title("[bold cyan1]Scan Complete[/]");

        table.AddColumn("[cyan1]Metric[/]");
        table.AddColumn("[cyan1]Result[/]");

        table.AddRow("Dependencies analyzed", ColorCount(results.TotalDependencies, results.FilesAnalyzed > 0));
        table.AddRow("Files analyzed", ColorCount(results.FilesAnalyzed, results.FilesAnalyzed > 0));
        table.AddRow("Vulnerabilities found", results.TotalVulnerabilities > 0
            ? $"[red]{results.TotalVulnerabilities}[/]"
            : "[green]0[/]");
        table.AddRow("Env variables pushed", ColorCount(results.EnvVariablesPushed, results.EnvVariablesPushed > 0));
        table.AddRow("Secret leaks detected", results.SecretLeaksFound > 0
            ? $"[red]{results.SecretLeaksFound}[/]"
            : "[green]0[/]");
        table.AddRow("Secret files uploaded", ColorCount(results.SecretFilesUploaded, results.SecretFilesUploaded > 0));

        AnsiConsole.Write(table);
    }

    private static string ColorCount(int count, bool positive)
    {
        return positive ? $"[green]{count}[/]" : $"[grey]{count}[/]";
    }
}
