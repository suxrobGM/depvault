using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Crypto;

/// <summary>Resolves the Data Encryption Key (DEK) for client-side vault crypto.</summary>
public sealed class DekResolver(
    IApiClientFactory clientFactory,
    ICredentialStore credentialStore,
    IConsolePrompter prompter,
    CommandContext commandContext)
{
    /// <summary>Resolves the DEK bytes by unwrapping from CI token or vault password.</summary>
    public async Task<byte[]?> ResolveAsync(string projectId, CancellationToken ct)
    {
        return commandContext.IsCiMode()
            ? await ResolveCiDekAsync(ct)
            : await ResolveJwtDekAsync(projectId, ct);
    }

    private async Task<byte[]?> ResolveCiDekAsync(CancellationToken ct)
    {
        var rawToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)!;
        var client = clientFactory.Create();

        var ciSecrets = await client.Api.Ci.Secrets.GetAsSecretsGetResponseAsync(cancellationToken: ct);

        if (ciSecrets is null)
        {
            AnsiConsole.MarkupLine("[red]Failed to fetch CI secrets metadata.[/]");
            return null;
        }

        var ciWrapKey = VaultCrypto.DeriveCiWrapKey(rawToken);
        return VaultCrypto.UnwrapKey(
            ciSecrets.WrappedDek ?? "", ciSecrets.WrappedDekIv ?? "",
            ciSecrets.WrappedDekTag ?? "", ciWrapKey);
    }

    private async Task<byte[]?> ResolveJwtDekAsync(string projectId, CancellationToken ct)
    {
        var password = Environment.GetEnvironmentVariable("DEPVAULT_VAULT_PASSWORD");
        if (string.IsNullOrEmpty(password))
        {
            if (!prompter.IsInteractive)
            {
                AnsiConsole.MarkupLine("[red]DEPVAULT_VAULT_PASSWORD is required in non-interactive mode.[/]");
                return null;
            }

            password = prompter.AskSecret("Enter vault password");
        }

        if (string.IsNullOrEmpty(password))
        {
            AnsiConsole.MarkupLine("[red]Vault password is required.[/]");
            return null;
        }

        var token = credentialStore.Load()?.AccessToken;
        if (string.IsNullOrEmpty(token))
        {
            AnsiConsole.MarkupLine("[red]Not authenticated. Run 'depvault login' first.[/]");
            return null;
        }

        var client = clientFactory.Create();

        var vaultStatus = await client.Api.Vault.Status.GetAsStatusGetResponseAsync(cancellationToken: ct);

        if (vaultStatus is null || string.IsNullOrEmpty(vaultStatus.KekSalt))
        {
            AnsiConsole.MarkupLine("[red]Failed to fetch vault status. Ensure vault is initialized.[/]");
            return null;
        }

        var salt = Convert.FromBase64String(vaultStatus.KekSalt);
        var iterations = vaultStatus.KekIterations > 0 ? vaultStatus.KekIterations.Value : 600_000;
        var kek = VaultCrypto.DeriveKek(password, salt, iterations);

        var keyGrant = await client.Api.Projects[projectId].KeyGrants.Mine
            .GetAsMineGetResponseAsync(cancellationToken: ct);

        if (keyGrant is null || string.IsNullOrEmpty(keyGrant.WrappedDek))
        {
            AnsiConsole.MarkupLine("[red]No key grant found. Ask a project admin to grant you access.[/]");
            return null;
        }

        return VaultCrypto.UnwrapKey(
            keyGrant.WrappedDek, keyGrant.WrappedDekIv ?? "", keyGrant.WrappedDekTag ?? "", kek);
    }
}
