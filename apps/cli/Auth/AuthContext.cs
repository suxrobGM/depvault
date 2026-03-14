using DepVault.Cli.Config;

namespace DepVault.Cli.Auth;

public enum AuthMode
{
    None,
    CiToken,
    Jwt
}

public interface IAuthContext
{
    AuthMode GetMode();
    bool RequireAuth();
    bool IsCiMode();
}

public sealed class AuthContext(ICredentialStore credentialStore) : IAuthContext
{
    public AuthMode GetMode()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)))
        {
            return AuthMode.CiToken;
        }

        if (credentialStore.Load() is not null)
        {
            return AuthMode.Jwt;
        }

        return AuthMode.None;
    }

    public bool RequireAuth()
    {
        if (GetMode() == AuthMode.None)
        {
            Console.Error.WriteLine("Not authenticated. Run 'depvault login' first.");
            return false;
        }

        return true;
    }

    public bool IsCiMode()
    {
        return GetMode() == AuthMode.CiToken;
    }
}
