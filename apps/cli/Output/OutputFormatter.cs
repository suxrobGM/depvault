using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

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
    private static readonly JsonSerializerOptions IndentedOptions = new() { WriteIndented = true };

    public void PrintTable(string[] headers, List<string[]> rows)
    {
        if (rows.Count == 0)
        {
            Console.WriteLine("No results found.");
            return;
        }

        var widths = new int[headers.Length];
        for (var i = 0; i < headers.Length; i++)
        {
            widths[i] = headers[i].Length;
        }

        foreach (var row in rows)
        {
            for (var i = 0; i < row.Length && i < widths.Length; i++)
            {
                widths[i] = Math.Max(widths[i], (row[i] ?? "").Length);
            }
        }

        for (var i = 0; i < headers.Length; i++)
        {
            Console.Write(headers[i].PadRight(widths[i]));
            if (i < headers.Length - 1)
            {
                Console.Write("  ");
            }
        }
        Console.WriteLine();

        for (var i = 0; i < headers.Length; i++)
        {
            Console.Write(new string('-', widths[i]));
            if (i < headers.Length - 1)
            {
                Console.Write("  ");
            }
        }
        Console.WriteLine();

        foreach (var row in rows)
        {
            for (var i = 0; i < headers.Length; i++)
            {
                var val = i < row.Length ? row[i] ?? "" : "";
                Console.Write(val.PadRight(widths[i]));
                if (i < headers.Length - 1)
                {
                    Console.Write("  ");
                }
            }
            Console.WriteLine();
        }
    }

    [UnconditionalSuppressMessage("Trimming", "IL2026", Justification = "Only used with anonymous types for CLI output")]
    [UnconditionalSuppressMessage("AOT", "IL3050", Justification = "Only used with anonymous types for CLI output")]
    public void PrintJson(object data)
    {
        Console.WriteLine(JsonSerializer.Serialize(data, IndentedOptions));
    }

    public void PrintKeyValue(string key, string? value)
    {
        Console.WriteLine($"{key}: {value ?? "(not set)"}");
    }

    public void PrintSuccess(string message) => Console.WriteLine(message);

    public void PrintError(string message) => Console.Error.WriteLine($"Error: {message}");

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
