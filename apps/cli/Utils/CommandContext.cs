using System.CommandLine;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Utils;

public enum AuthMode
{
    None,
    CiToken,
    Jwt
}

/// <summary>Bundles the shared deps that every command needs (auth, config, output, prompter).</summary>
public sealed class CommandContext(
    ICredentialStore credentialStore,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    public IOutputFormatter Output => output;
    public IConsolePrompter Prompter => prompter;
    public IConfigService Config => configService;

    public AuthMode GetAuthMode()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)))
        {
            return AuthMode.CiToken;
        }

        return credentialStore.Load() is not null ? AuthMode.Jwt : AuthMode.None;
    }

    public bool RequireAuth()
    {
        if (GetAuthMode() == AuthMode.None)
        {
            output.PrintError("Not authenticated. Run 'depvault login' first.");
            return false;
        }

        return true;
    }

    public bool IsCiMode() => GetAuthMode() == AuthMode.CiToken;

    /// <summary>Resolves project ID from the CLI option or active config.</summary>
    public string? RequireProjectId(ParseResult parseResult, Option<string?> projectOpt)
        => RequireProjectId(parseResult.GetValue(projectOpt));

    /// <summary>Resolves project ID from explicit value or active config.</summary>
    public string? RequireProjectId(string? projectId)
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
    public bool RequireFile(string path)
    {
        if (File.Exists(path))
        {
            return true;
        }

        output.PrintError($"File not found: {path}");
        return false;
    }

    /// <summary>Resolves environment type from explicit flag, filename detection, or interactive prompt.</summary>
    public string ResolveEnvironmentType(string? explicitEnv, string? detected)
    {
        if (!string.IsNullOrEmpty(explicitEnv))
        {
            return explicitEnv;
        }

        if (!string.IsNullOrEmpty(detected))
        {
            return detected;
        }

        if (prompter.IsInteractive)
        {
            return prompter.Select("Select environment type", CommandUtils.EnvironmentTypes, e => e);
        }

        return "DEVELOPMENT";
    }

    /// <summary>Resolves a file path from CLI option or interactive file discovery.</summary>
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
