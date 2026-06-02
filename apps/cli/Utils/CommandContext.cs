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

    /// <summary>Prints a compact one-liner showing the active project name and ID.</summary>
    public void PrintProjectBanner()
    {
        var config = configService.Load();
        if (config.ActiveProjectId is null)
        {
            return;
        }

        if (config.ActiveProjectName is not null)
        {
            AnsiConsole.MarkupLine(
                $"[cyan1]Project:[/] {Markup.Escape(config.ActiveProjectName)} [grey]({Markup.Escape(config.ActiveProjectId)})[/]");
        }
        else
        {
            AnsiConsole.MarkupLine($"[cyan1]Project:[/] {Markup.Escape(config.ActiveProjectId)}");
        }
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
