using System.CommandLine;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;

namespace DepVault.Cli.Commands;

internal static class CommandHelpers
{
    /// <summary>Resolves project ID from CLI option or active config.</summary>
    public static string? RequireProjectId(
        ParseResult parseResult, Option<string?> projectOpt,
        IConfigService configService, IOutputFormatter output)
    {
        var projectId = parseResult.GetValue(projectOpt) ?? configService.Load().ActiveProjectId;
        if (string.IsNullOrEmpty(projectId))
        {
            output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
            return null;
        }

        return projectId;
    }

    /// <summary>Checks file exists and prints error if not.</summary>
    public static bool RequireFile(string path, IOutputFormatter output)
    {
        if (File.Exists(path)) return true;
        output.PrintError($"File not found: {path}");
        return false;
    }

    /// <summary>Parses a Kiota-generated enum by member name, returning fallback on mismatch.</summary>
    public static T ParseEnum<T>(string value, T fallback) where T : struct, Enum =>
        Enum.TryParse<T>(value, ignoreCase: true, out var result) ? result : fallback;

    /// <summary>
    /// Resolves a file path from CLI option or interactive file discovery.
    /// Returns null on failure (with error printed).
    /// </summary>
    public static string? ResolveFileInteractive(
        ParseResult parseResult, Option<string?> fileOpt,
        IConsolePrompter prompter, IOutputFormatter output,
        Func<List<DiscoveredFile>> discoverFiles, string fileTypeLabel)
    {
        var filePath = parseResult.GetValue(fileOpt);

        if (!string.IsNullOrEmpty(filePath))
        {
            return RequireFile(filePath, output) ? filePath : null;
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError($"--file is required in non-interactive mode.");
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
            return prompter.Confirm($"Use [cyan1]{Spectre.Console.Markup.Escape(discovered[0].RelativePath)}[/]?")
                ? discovered[0].FullPath
                : null;
        }

        var selected = prompter.Select($"Select a {fileTypeLabel} file", discovered, f => f.RelativePath);
        return selected.FullPath;
    }
}
