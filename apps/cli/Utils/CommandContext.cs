using System.CommandLine;
using DepVault.Cli.Auth;
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

/// <summary>Auth + project ID + API client resolved in one step.</summary>
public sealed record ProjectContext(string ProjectId, ApiClient.ApiClient Client);

/// <summary>Bundles the shared deps that every command needs (auth, config, output, prompter).</summary>
public sealed class CommandContext(
    ICredentialStore credentialStore,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IApiClientFactory clientFactory)
{
    public IOutputFormatter Output => output;
    public IConsolePrompter Prompter => prompter;
    public IConfigService Config => configService;

    /// <summary>
    /// One-call guard: checks auth, resolves project ID (with folder auto-detection), prints
    /// the project banner, and creates the API client. Returns null when any step fails.
    /// </summary>
    public async Task<ProjectContext?> RequireProjectContextAsync(
        ParseResult parseResult, Option<string?> projectOpt, CancellationToken ct = default)
    {
        if (!RequireAuth())
        {
            return null;
        }

        var projectId = await RequireProjectIdAsync(parseResult, projectOpt, ct);
        if (projectId is null)
        {
            return null;
        }

        PrintProjectBanner();
        return new ProjectContext(projectId, clientFactory.Create());
    }

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

    /// <summary>Resolves project ID from the CLI option, active config, or folder-name auto-detection.</summary>
    public Task<string?> RequireProjectIdAsync(
        ParseResult parseResult, Option<string?> projectOpt, CancellationToken ct = default)
    {
        var explicit_ = parseResult.GetValue(projectOpt);
        if (!string.IsNullOrEmpty(explicit_))
        {
            return Task.FromResult<string?>(explicit_);
        }

        return RequireProjectIdAsync(ct);
    }

    /// <summary>Resolves project ID from active config or folder-name auto-detection.</summary>
    public async Task<string?> RequireProjectIdAsync(CancellationToken ct = default)
    {
        var config = configService.Load();
        if (!string.IsNullOrEmpty(config.ActiveProjectId))
        {
            return config.ActiveProjectId;
        }

        // Auto-detect from folder name
        if (GetAuthMode() != AuthMode.None)
        {
            var resolved = await ResolveProjectFromDirectoryAsync(ct);
            if (resolved is not null)
            {
                return resolved;
            }
        }

        output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
        return null;
    }

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

    private async Task<string?> ResolveProjectFromDirectoryAsync(CancellationToken ct)
    {
        try
        {
            var candidateNames = GetDirectoryCandidates();
            if (candidateNames.Count == 0)
            {
                return null;
            }

            var apiClient = clientFactory.Create();
            var result = await apiClient.Api.Projects.GetAsync(config =>
            {
                config.QueryParameters.Page = 1;
                config.QueryParameters.Limit = 100;
            }, ct);

            var items = result?.Items;
            if (items is null || items.Count == 0)
            {
                return null;
            }

            foreach (var candidate in candidateNames)
            {
                var match = items.FirstOrDefault(p =>
                    string.Equals(p.Name, candidate, StringComparison.OrdinalIgnoreCase));

                if (match?.Id is not null)
                {
                    var config = configService.Load();
                    config.ActiveProjectId = match.Id;
                    config.ActiveProjectName = match.Name;
                    configService.Save(config);

                    AnsiConsole.MarkupLine(
                        $"[green]Auto-detected project:[/] {Markup.Escape(match.Name ?? match.Id)} [grey](matched folder \"{Markup.Escape(candidate)}\")[/]");
                    return match.Id;
                }
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static List<string> GetDirectoryCandidates()
    {
        var candidates = new List<string>();
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());

        for (var i = 0; i < 3 && dir is not null; i++)
        {
            if (!string.IsNullOrEmpty(dir.Name))
            {
                candidates.Add(dir.Name);
            }

            dir = dir.Parent;
        }

        return candidates;
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
