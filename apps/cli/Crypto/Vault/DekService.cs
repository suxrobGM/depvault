using System.Security.Cryptography;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;
using KeygrantBody = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody;
using GrantType = DepVault.Cli.ApiClient.Api.Projects.Item.Keygrants.KeygrantsPostRequestBody_grantType;

namespace DepVault.Cli.Crypto;

/// <summary>Resolves project DEKs for client-side vault crypto.</summary>
public sealed class DekService(
    IApiClientFactory clientFactory,
    ICredentialStore credentialStore,
    AuthContext commandContext,
    VaultState vaultState,
    VaultUnlockService vaultUnlockService,
    RememberedUnlockService rememberedUnlockService,
    IOutputFormatter output,
    ConsoleRenderer renderer)
{
    private sealed record DekResolutionResult(byte[]? Dek, bool DroppedStaleSession);

    /// <summary>
    /// Collects the vault password if needed, reporting whether it came from an interactive prompt (vs.
    /// env/cache/session). Must be called outside Spectre dynamic displays.
    /// </summary>
    public (string? Password, bool FromPrompt) CollectVaultPassword()
    {
        var input = vaultUnlockService.CollectVaultPassword();
        return (input.Password, input.FromPrompt);
    }

    /// <summary>
    /// Collects the vault password first, then resolves the DEK under a progress spinner. This is the
    /// one-call entry point used by push, pull, and scan.
    /// </summary>
    public async Task<byte[]?> CollectPasswordAndResolveAsync(string projectId, CancellationToken ct)
    {
        var hadSession = !commandContext.IsCiMode() && !vaultState.IsUnlocked
            && rememberedUnlockService.HasSession();
        var (password, fromPrompt) = CollectVaultPassword();

        var result = await ResolveWithMetadataAsync(projectId, password, ct);
        var dek = result.Dek;

        // A remembered session that turned out stale is dropped during resolution. Since we suppressed
        // the prompt on its behalf, prompt now and retry once rather than leaving the user stuck.
        if (dek is null && hadSession && password is null && result.DroppedStaleSession
            && commandContext.Prompter.IsInteractive && !commandContext.IsCiMode()
            && !vaultState.IsUnlocked && !rememberedUnlockService.HasSession())
        {
            password = commandContext.Prompter.AskSecret("Enter vault password");
            if (!string.IsNullOrEmpty(password))
            {
                fromPrompt = true;
                result = await ResolveWithMetadataAsync(projectId, password, ct);
                dek = result.Dek;
            }
        }

        if (dek is not null && fromPrompt)
        {
            rememberedUnlockService.MaybeOfferRememberUnlock(null);
        }

        return dek;
    }

    public void MaybeOfferRememberUnlock(TimeSpan? ttlOverride)
    {
        rememberedUnlockService.MaybeOfferRememberUnlock(ttlOverride);
    }

    /// <summary>Resolves the DEK bytes by unwrapping from CI token or vault password.</summary>
    public async Task<byte[]?> ResolveAsync(string projectId, string? vaultPassword, CancellationToken ct)
    {
        return commandContext.IsCiMode()
            ? await ResolveCiDekAsync(ct)
            : (await ResolveJwtDekAsync(projectId, vaultPassword, ct)).Dek;
    }

    private async Task<DekResolutionResult> ResolveWithMetadataAsync(
        string projectId,
        string? vaultPassword,
        CancellationToken ct)
    {
        if (commandContext.IsCiMode())
        {
            return new DekResolutionResult(await ResolveCiDekAsync(ct), DroppedStaleSession: false);
        }

        return await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await ResolveJwtDekAsync(projectId, vaultPassword, ct));
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

    private async Task<DekResolutionResult> ResolveJwtDekAsync(
        string projectId,
        string? password,
        CancellationToken ct)
    {
        var cachedDek = vaultState.GetCachedDek(projectId);
        if (cachedDek is not null)
        {
            return new DekResolutionResult(cachedDek, DroppedStaleSession: false);
        }

        var token = credentialStore.Load()?.AccessToken;
        if (string.IsNullOrEmpty(token))
        {
            output.PrintError("Not authenticated. Run 'depvault login' first.");
            return new DekResolutionResult(null, DroppedStaleSession: false);
        }

        var unlock = await vaultUnlockService.ResolveKekAsync(password, ct);
        if (unlock.Kek is null)
        {
            return new DekResolutionResult(null, unlock.DroppedStaleSession);
        }

        var apiClient = clientFactory.Create();
        try
        {
            var keyGrant = await apiClient.Api.Projects[projectId].Keygrants.My
                .GetAsync(cancellationToken: ct);

            if (keyGrant is not null && !string.IsNullOrEmpty(keyGrant.WrappedDek))
            {
                var dek = VaultCrypto.UnwrapKey(
                    keyGrant.WrappedDek, keyGrant.WrappedDekIv ?? "", keyGrant.WrappedDekTag ?? "",
                    unlock.Kek);
                vaultState.CacheDek(projectId, dek);
                return new DekResolutionResult(dek, DroppedStaleSession: false);
            }

            return new DekResolutionResult(
                await CreateSelfGrantAsync(projectId, unlock.Kek, ct),
                DroppedStaleSession: false);
        }
        catch (ApiException ex) when (ex.ResponseStatusCode is 404)
        {
            return new DekResolutionResult(
                await CreateSelfGrantAsync(projectId, unlock.Kek, ct),
                DroppedStaleSession: false);
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
