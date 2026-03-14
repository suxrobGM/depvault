using Microsoft.Kiota.Abstractions;
using Microsoft.Kiota.Abstractions.Authentication;
using DepVault.Cli.Config;

namespace DepVault.Cli.Auth;

/// <summary>
/// Kiota authentication provider that adds Bearer token from stored credentials
/// or DEPVAULT_TOKEN environment variable.
/// </summary>
public sealed class TokenAuthProvider(ICredentialStore credentialStore) : IAuthenticationProvider
{
    public Task AuthenticateRequestAsync(
        RequestInformation request,
        Dictionary<string, object>? additionalAuthenticationContext = null,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveToken();
        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
        }
        return Task.CompletedTask;
    }

    private string? ResolveToken()
    {
        var envToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar);
        if (!string.IsNullOrEmpty(envToken))
        {
            return envToken;
        }

        return credentialStore.Load()?.AccessToken;
    }
}
