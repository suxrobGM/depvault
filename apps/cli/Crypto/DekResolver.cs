using System.Security.Cryptography;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;
using KeygrantBody = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody;
using GrantType = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody_grantType;

namespace DepVault.Cli.Crypto;

/// <summary>Resolves the Data Encryption Key (DEK) for client-side vault crypto.</summary>
public sealed class DekResolver(
    IApiClientFactory clientFactory,
    ICredentialStore credentialStore,
    IConsolePrompter prompter,
    CommandContext commandContext,
    VaultState vaultState)
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
            AnsiConsole.MarkupLine("[red]DEPVAULT_PASSWORD is required in non-interactive mode.[/]");
            return null;
        }

        return prompter.AskSecret("Enter vault password");
    }

    /// <summary>Resolves the DEK bytes by unwrapping from CI token or vault password.</summary>
    public async Task<byte[]?> ResolveAsync(string projectId, string? vaultPassword, CancellationToken ct)
    {
        return commandContext.IsCiMode()
            ? await ResolveCiDekAsync(ct)
            : await ResolveJwtDekAsync(projectId, vaultPassword, ct);
    }

    private async Task<byte[]?> ResolveCiDekAsync(CancellationToken ct)
    {
        var rawToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)!;
        var client = clientFactory.Create();

        var ciSecrets = await client.Api.Ci.Secrets.GetAsync(cancellationToken: ct);

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
            AnsiConsole.MarkupLine("[red]Not authenticated. Run 'depvault login' first.[/]");
            return null;
        }

        var apiClient = clientFactory.Create();
        var vaultStatus = await apiClient.Api.Vault.Status.GetAsync(cancellationToken: ct);

        if (vaultStatus is null || string.IsNullOrEmpty(vaultStatus.KekSalt))
        {
            AnsiConsole.MarkupLine("[red]Failed to fetch vault status. Ensure vault is initialized.[/]");
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
                AnsiConsole.MarkupLine("[red]Vault password is required.[/]");
                return null;
            }

            var salt = Convert.FromBase64String(vaultStatus.KekSalt);
            var iterations = vaultStatus.KekIterations > 0 ? vaultStatus.KekIterations.Value : 600_000;
            kek = VaultCrypto.DeriveKek(password, salt, iterations);

            // Verify the KEK by unwrapping the server-stored wrapped private key.
            // Without this, a wrong password silently produces a new SELF grant
            // wrapped with an unusable KEK, corrupting future decrypts.
            if (!VerifyKek(kek, vaultStatus))
            {
                CryptographicOperations.ZeroMemory(kek);
                AnsiConsole.MarkupLine("[red]Incorrect vault password.[/]");
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
            PrintKeyGrantError();
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
            AnsiConsole.MarkupLine("[green]Created encryption key for this project.[/]");
            return dek;
        }
        catch
        {
            PrintKeyGrantError();
            return null;
        }
    }

    /// <summary>
    /// Verifies a candidate KEK by attempting to unwrap the server-stored wrapped private key.
    /// A successful unwrap proves the KEK was derived from the correct password and salt; a
    /// failed unwrap (AES-GCM auth tag mismatch) proves it was not. Returns true on success.
    /// </summary>
    private static bool VerifyKek(byte[] kek, ApiClient.Api.Vault.Status.StatusGetResponse status)
    {
        if (string.IsNullOrEmpty(status.WrappedPrivateKey) ||
            string.IsNullOrEmpty(status.WrappedPrivateKeyIv) ||
            string.IsNullOrEmpty(status.WrappedPrivateKeyTag))
        {
            // Vault has no wrapped private key yet — can't verify, but this shouldn't happen
            // for a fully-initialized vault. Allow through rather than block on bad server state.
            return true;
        }

        try
        {
            var raw = VaultCrypto.UnwrapKey(
                status.WrappedPrivateKey, status.WrappedPrivateKeyIv, status.WrappedPrivateKeyTag, kek);
            CryptographicOperations.ZeroMemory(raw);
            return true;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }

    private static void PrintKeyGrantError()
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Panel(
                new Rows(
                    new Markup("[red]No encryption key grant found for this project.[/]"),
                    new Markup(""),
                    new Markup("[grey]Key grants are created when you first open a project's vault[/]"),
                    new Markup("[grey]in the web dashboard. To fix this:[/]"),
                    new Markup(""),
                    new Markup("  [cyan1]1.[/] [grey]Open the DepVault web dashboard[/]"),
                    new Markup("  [cyan1]2.[/] [grey]Navigate to this project → [bold]Vault[/] tab[/]"),
                    new Markup("  [cyan1]3.[/] [grey]Unlock the vault with your password[/]"),
                    new Markup("  [cyan1]4.[/] [grey]Run this CLI command again[/]"),
                    new Markup(""),
                    new Markup("[grey]If you are a team member, ask the project owner to grant[/]"),
                    new Markup("[grey]you access from the [bold]Team[/] settings page.[/]")))
            .Header("[red]Key Grant Missing[/]")
            .Border(BoxBorder.Rounded)
            .BorderStyle(new Style(Color.Red))
            .Padding(1, 0));
        AnsiConsole.WriteLine();
    }
}
