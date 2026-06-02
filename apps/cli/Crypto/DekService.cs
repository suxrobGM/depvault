using System.Security.Cryptography;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;
using KeygrantBody = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody;
using GrantType = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody_grantType;

namespace DepVault.Cli.Crypto;

/// <summary>Resolves the Data Encryption Key (DEK) for client-side vault crypto.</summary>
public sealed class DekService(
    IApiClientFactory clientFactory,
    ICredentialStore credentialStore,
    IConsolePrompter prompter,
    AuthContext commandContext,
    VaultState vaultState,
    IOutputFormatter output,
    ConsoleRenderer renderer)
{
    /// <summary>
    /// Collects the vault password interactively if needed. Returns null when the KEK is
    /// already cached or in CI mode. Must be called outside Spectre dynamic displays.
    /// </summary>
    public string? CollectVaultPassword()
    {
        if (commandContext.IsCiMode())
        {
            return null;
        }

        if (vaultState.IsUnlocked)
        {
            return null;
        }

        var password = Environment.GetEnvironmentVariable("DEPVAULT_PASSWORD");
        if (!string.IsNullOrEmpty(password))
        {
            return password;
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("DEPVAULT_PASSWORD is required in non-interactive mode.");
            return null;
        }

        return prompter.AskSecret("Enter vault password");
    }

    /// <summary>
    /// Collects the vault password first (outside any Spectre <c>Status</c> — Spectre throws if a
    /// prompt runs inside a live display), then resolves the DEK under a progress spinner. This is
    /// the one-call entry point used by push, pull, and scan.
    /// </summary>
    public async Task<byte[]?> CollectPasswordAndResolveAsync(string projectId, CancellationToken ct)
    {
        var password = CollectVaultPassword();
        return await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await ResolveAsync(projectId, password, ct));
    }

    /// <summary>Resolves the DEK bytes by unwrapping from CI token or vault password.</summary>
    public async Task<byte[]?> ResolveAsync(string projectId, string? vaultPassword, CancellationToken ct)
    {
        return commandContext.IsCiMode()
            ? await ResolveCiDekAsync(ct)
            : await ResolveJwtDekAsync(projectId, vaultPassword, ct);
    }

    /// <summary>Unwraps the project DEK from the CI secrets endpoint using the CI token wrap key.</summary>
    public async Task<byte[]?> ResolveCiDekAsync(CancellationToken ct)
    {
        var rawToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)!;
        var client = clientFactory.Create();

        var ciSecrets = await client.Api.Ci.Secrets.GetAsync(cancellationToken: ct);

        if (ciSecrets is null)
        {
            output.PrintError("Failed to fetch CI secrets metadata.");
            return null;
        }

        var ciWrapKey = VaultCrypto.DeriveCiWrapKey(rawToken);
        return VaultCrypto.UnwrapKey(
            ciSecrets.WrappedDek ?? "", ciSecrets.WrappedDekIv ?? "",
            ciSecrets.WrappedDekTag ?? "", ciWrapKey);
    }

    private async Task<byte[]?> ResolveJwtDekAsync(string projectId, string? password, CancellationToken ct)
    {
        // 1. Check DEK cache first
        var cachedDek = vaultState.GetCachedDek(projectId);
        if (cachedDek is not null)
        {
            return cachedDek;
        }

        // 2. Fetch vault status. We always need it — to detect a salt rotation
        //    against a stale cached KEK, and to verify a freshly derived KEK.
        var token = credentialStore.Load()?.AccessToken;
        if (string.IsNullOrEmpty(token))
        {
            output.PrintError("Not authenticated. Run 'depvault login' first.");
            return null;
        }

        var apiClient = clientFactory.Create();
        var vaultStatus = await apiClient.Api.Vault.Status.GetAsync(cancellationToken: ct);

        if (vaultStatus is null || string.IsNullOrEmpty(vaultStatus.KekSalt))
        {
            output.PrintError("Failed to fetch vault status. Ensure vault is initialized.");
            return null;
        }

        // 3. Invalidate a cached KEK whose salt no longer matches the server's.
        //    This happens when the vault password was rotated from another client.
        if (vaultState.IsUnlocked && vaultState.KekSalt != vaultStatus.KekSalt)
        {
            AnsiConsole.MarkupLine(
                "[yellow]Vault password appears to have changed elsewhere — re-unlocking.[/]");
            vaultState.Lock();
        }

        // 4. Resolve KEK: use cached (now known-fresh) or derive from password
        byte[] kek;
        if (vaultState.IsUnlocked)
        {
            kek = vaultState.Kek!;
        }
        else
        {
            if (string.IsNullOrEmpty(password))
            {
                output.PrintError("Vault password required. Run 'unlock' or set DEPVAULT_PASSWORD.");
                return null;
            }

            var salt = Convert.FromBase64String(vaultStatus.KekSalt);
            var iterations = vaultStatus.KekIterations > 0 ? vaultStatus.KekIterations.Value : 600_000;
            kek = VaultCrypto.DeriveKek(password, salt, iterations);

            // Verify the KEK by unwrapping the server-stored wrapped private key.
            // Without this, a wrong password silently produces a new SELF grant
            // wrapped with an unusable KEK, corrupting future decrypts.
            if (!VaultCrypto.VerifyKek(
                    vaultStatus.WrappedPrivateKey ?? "", vaultStatus.WrappedPrivateKeyIv ?? "",
                    vaultStatus.WrappedPrivateKeyTag ?? "", kek))
            {
                CryptographicOperations.ZeroMemory(kek);
                output.PrintError("Incorrect vault password.");
                return null;
            }

            vaultState.Unlock(kek, vaultStatus.KekSalt);
        }

        // 5. Fetch key grant and unwrap DEK
        try
        {
            var keyGrant = await apiClient.Api.Projects[projectId].Keygrants.My
                .GetAsync(cancellationToken: ct);

            if (keyGrant is not null && !string.IsNullOrEmpty(keyGrant.WrappedDek))
            {
                var dek = VaultCrypto.UnwrapKey(
                    keyGrant.WrappedDek, keyGrant.WrappedDekIv ?? "", keyGrant.WrappedDekTag ?? "", kek);
                vaultState.CacheDek(projectId, dek);
                return dek;
            }

            // No grant found — auto-create SELF grant
            return await CreateSelfGrantAsync(projectId, kek, ct);
        }
        catch (ApiException ex) when (ex.ResponseStatusCode is 404)
        {
            return await CreateSelfGrantAsync(projectId, kek, ct);
        }
    }

    /// <summary>Generate a new DEK, wrap with KEK, and POST a SELF grant to the server.</summary>
    private async Task<byte[]?> CreateSelfGrantAsync(string projectId, byte[] kek, CancellationToken ct)
    {
        var creds = credentialStore.Load();
        if (creds?.UserId is null)
        {
            renderer.PrintKeyGrantError();
            return null;
        }

        try
        {
            var dek = RandomNumberGenerator.GetBytes(32);
            var (wrappedDek, iv, tag) = VaultCrypto.WrapKey(dek, kek);

            var client = clientFactory.Create();
            await client.Api.Projects[projectId].Keygrants.PostAsync(new KeygrantBody
            {
                UserId = Guid.Parse(creds.UserId),
                WrappedDek = wrappedDek,
                WrappedDekIv = iv,
                WrappedDekTag = tag,
                GrantType = GrantType.SELF
            }, cancellationToken: ct);

            vaultState.CacheDek(projectId, dek);
            output.PrintSuccess("Created encryption key for this project.");
            return dek;
        }
        catch
        {
            renderer.PrintKeyGrantError();
            return null;
        }
    }
}
