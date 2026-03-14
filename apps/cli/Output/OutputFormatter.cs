using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Spectre.Console;

namespace DepVault.Cli.Output;

public interface IOutputFormatter
{
    void PrintTable(string[] headers, List<string[]> rows);
    void PrintJson(object data);
    void PrintKeyValue(string key, string? value);
    void PrintSuccess(string message);
    void PrintError(string message);
    void WriteContent(string content, string? outputPath);
}

public sealed class OutputFormatter : IOutputFormatter
{
    private static readonly JsonSerializerOptions indentedOptions = new() { WriteIndented = true };

    public void PrintTable(string[] headers, List<string[]> rows)
    {
        if (rows.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No results found.[/]");
            return;
        }

        var table = new Table()
            .Border(ConsoleTheme.Border)
            .BorderStyle(new Style(ConsoleTheme.Muted));

        foreach (var header in headers)
        {
            table.AddColumn(new TableColumn($"[cyan1]{Markup.Escape(header)}[/]"));
        }

        foreach (var row in rows)
        {
            var cells = new string[headers.Length];
            for (var i = 0; i < headers.Length; i++)
            {
                cells[i] = Markup.Escape(i < row.Length ? row[i] ?? "" : "");
            }

            table.AddRow(cells);
        }

        AnsiConsole.Write(table);
    }

    [UnconditionalSuppressMessage("Trimming", "IL2026",
        Justification = "Only used with anonymous types for CLI output")]
    [UnconditionalSuppressMessage("AOT", "IL3050", Justification = "Only used with anonymous types for CLI output")]
    public void PrintJson(object data)
    {
        Console.WriteLine(JsonSerializer.Serialize(data, indentedOptions));
    }

    public void PrintKeyValue(string key, string? value)
    {
        AnsiConsole.MarkupLine($"[cyan1]{Markup.Escape(key)}[/]: {Markup.Escape(value ?? "(not set)")}");
    }

    public void PrintSuccess(string message)
    {
        AnsiConsole.MarkupLine($"[green]{Markup.Escape(message)}[/]");
    }

    public void PrintError(string message)
    {
        AnsiConsole.MarkupLine($"[red]Error: {Markup.Escape(message)}[/]");
    }

    public void WriteContent(string content, string? outputPath)
    {
        if (!string.IsNullOrEmpty(outputPath))
        {
            File.WriteAllText(outputPath, content);
            PrintSuccess($"Written to {outputPath}");
        }
        else
        {
            Console.Write(content);
            if (content.Length > 0 && !content.EndsWith(Environment.NewLine))
            {
                Console.WriteLine();
            }
        }
    }
}
