using DepVault.Cli.Config;
using DepVault.Cli.Output;
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
}
