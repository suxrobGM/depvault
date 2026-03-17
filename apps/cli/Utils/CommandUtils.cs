using System.CommandLine;
using System.Reflection;
using System.Runtime.Serialization;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Utils;

/// <summary>
///     Utility methods for command-line parsing and validation.
/// </summary>
internal static class CommandUtils
{
    internal static readonly string[] EnvironmentTypes = ["DEVELOPMENT", "STAGING", "PRODUCTION", "GLOBAL"];

    /// <summary>Resolves project ID from the CLI option or active config.</summary>
    public static string? RequireProjectId(
        ParseResult parseResult, Option<string?> projectOpt,
        IConfigService configService, IOutputFormatter output)
    {
        return RequireProjectId(parseResult.GetValue(projectOpt), configService, output);
    }

    /// <summary>Resolves project ID from explicit value or active config.</summary>
    public static string? RequireProjectId(
        string? projectId, IConfigService configService, IOutputFormatter output)
    {
        projectId ??= configService.Load().ActiveProjectId;
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
        if (File.Exists(path))
        {
            return true;
        }

        output.PrintError($"File not found: {path}");
        return false;
    }

    /// <summary>
    /// Parses a Kiota-generated enum by member name or [EnumMember] value attribute.
    /// Handles values like "appsettings.json" that don't match the C# member name.
    /// </summary>
    public static T ParseEnum<T>(string value, T fallback) where T : struct, Enum
    {
        if (Enum.TryParse<T>(value, true, out var result))
        {
            return result;
        }

        var enumFields = typeof(T).GetFields(BindingFlags.Public | BindingFlags.Static);

        foreach (var field in enumFields)
        {
            var attr = field.GetCustomAttributes(typeof(EnumMemberAttribute), false);
            if (attr.Length > 0 && ((EnumMemberAttribute)attr[0]).Value == value)
            {
                return (T)field.GetValue(null)!;
            }
        }

        return fallback;
    }

    /// <summary>
    ///     Resolves environment type from an explicit flag value, filename detection, or interactive prompt.
    ///     <paramref name="explicitEnv" /> is the --environment flag; <paramref name="detected" /> is from filename inference.
    /// </summary>
    public static string ResolveEnvironmentType(
        string? explicitEnv, string? detected, IConsolePrompter prompter)
    {
        // Explicit flag always wins
        if (!string.IsNullOrEmpty(explicitEnv))
        {
            return explicitEnv;
        }

        // Filename-inferred value
        if (!string.IsNullOrEmpty(detected))
        {
            return detected;
        }

        // Interactive prompt when we can't determine from filename
        if (prompter.IsInteractive)
        {
            return prompter.Select("Select environment type", EnvironmentTypes, e => e);
        }

        return "DEVELOPMENT";
    }

    /// <summary>
    ///     Resolves a file path from CLI option or interactive file discovery.
    ///     Returns null on failure (with error printed).
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
