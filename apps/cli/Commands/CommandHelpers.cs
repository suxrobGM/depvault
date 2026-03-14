using System.CommandLine;
using DepVault.Cli.Config;
using DepVault.Cli.Output;

namespace DepVault.Cli.Commands;

internal static class CommandHelpers
{
    /// <summary>Resolves project ID from CLI option or active config. Prints error and returns null on failure.</summary>
    public static string? RequireProjectId(ParseResult parseResult, Option<string?> projectOpt, IConfigService configService, IOutputFormatter output)
    {
        var projectId = parseResult.GetValue(projectOpt) ?? configService.Load().ActiveProjectId;
        if (string.IsNullOrEmpty(projectId))
        {
            output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
            return null;
        }
        return projectId;
    }

    /// <summary>Checks file exists and prints error if not. Returns false on failure.</summary>
    public static bool RequireFile(string path, IOutputFormatter output)
    {
        if (File.Exists(path))
        {
            return true;
        }

        output.PrintError($"File not found: {path}");
        return false;
    }

    /// <summary>Parses a Kiota-generated enum by member name, returning fallback on mismatch.</summary>
    public static T ParseEnum<T>(string value, T fallback) where T : struct, Enum
        => Enum.TryParse<T>(value, ignoreCase: true, out var result) ? result : fallback;
}
