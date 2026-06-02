using System.CommandLine;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Services;

/// <summary>Resolves a file path from a <c>--file</c> option or interactive discovery.</summary>
public interface IFileArgResolver
{
    /// <summary>Checks the file exists, printing an error if not.</summary>
    bool RequireFile(string path);

    /// <summary>
    /// Returns the explicit <c>--file</c> value if given (validated), otherwise discovers candidate
    /// files and prompts the user to pick one. Returns null when nothing usable is resolved.
    /// </summary>
    string? ResolveFileInteractive(
        ParseResult parseResult, Option<string?> fileOpt,
        Func<List<DiscoveredFile>> discoverFiles, string fileTypeLabel);
}

public sealed class FileArgResolver(IOutputFormatter output, IConsolePrompter prompter) : IFileArgResolver
{
    public bool RequireFile(string path)
    {
        if (File.Exists(path))
        {
            return true;
        }

        output.PrintError($"File not found: {path}");
        return false;
    }

    public string? ResolveFileInteractive(
        ParseResult parseResult, Option<string?> fileOpt,
        Func<List<DiscoveredFile>> discoverFiles, string fileTypeLabel)
    {
        var filePath = parseResult.GetValue(fileOpt);

        if (!string.IsNullOrEmpty(filePath))
        {
            return RequireFile(filePath) ? filePath : null;
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("--file is required in non-interactive mode.");
            return null;
        }

        var discovered = discoverFiles();
        if (discovered.Count == 0)
        {
            output.PrintError($"No {fileTypeLabel} files found in current directory.");
            return null;
        }

        if (discovered.Count == 1)
        {
            return prompter.Confirm($"Use [cyan1]{Markup.Escape(discovered[0].RelativePath)}[/]?")
                ? discovered[0].FullPath
                : null;
        }

        var selected = prompter.Select($"Select a {fileTypeLabel} file", discovered, f => f.RelativePath);
        return selected.FullPath;
    }
}
