using DepVault.Cli.Config;
using DepVault.Cli.Output;

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
}
