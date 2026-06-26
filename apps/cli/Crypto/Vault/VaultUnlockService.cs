using System.Security.Cryptography;
using DepVault.Cli.Auth;
using StatusResponse = DepVault.Cli.ApiClient.Api.Vault.Status.StatusGetResponse;

namespace DepVault.Cli.Crypto;

public readonly record struct VaultPasswordInput(string? Password, bool FromPrompt);

public readonly record struct VaultUnlockResult(byte[]? Kek, bool DroppedStaleSession);

/// <summary>Resolves and verifies the vault KEK from memory, remembered storage, or a password.</summary>
public sealed class VaultUnlockService(
    IApiClientFactory clientFactory,
    AuthContext commandContext,
    VaultState vaultState,
    RememberedUnlockService rememberedUnlockService)
{
    public VaultPasswordInput CollectVaultPassword()
    {
        if (commandContext.IsCiMode())
        {
            return new VaultPasswordInput(null, false);
        }

        if (vaultState.IsUnlocked)
        {
            return new VaultPasswordInput(null, false);
        }

        // The env password is a free, non-interactive fallback. Read it before deferring to a
        // remembered session so a stale remembered unlock can still fall back to it.
        var password = Environment.GetEnvironmentVariable("DEPVAULT_PASSWORD");
        if (!string.IsNullOrEmpty(password))
        {
            return new VaultPasswordInput(password, false);
        }

        if (rememberedUnlockService.HasSession())
        {
            return new VaultPasswordInput(null, false);
        }

        if (!commandContext.Prompter.IsInteractive)
        {
            commandContext.Output.PrintError("DEPVAULT_PASSWORD is required in non-interactive mode.");
            return new VaultPasswordInput(null, false);
        }

        return new VaultPasswordInput(commandContext.Prompter.AskSecret("Enter vault password"), true);
    }

    public async Task<VaultUnlockResult> ResolveKekAsync(
        string? password,
        CancellationToken ct,
        string statusErrorMessage = "Failed to fetch vault status. Ensure vault is initialized.")
    {
        var client = clientFactory.Create();
        var vaultStatus = await client.Api.Vault.Status.GetAsync(cancellationToken: ct);

        if (vaultStatus is null || string.IsNullOrEmpty(vaultStatus.KekSalt))
        {
            commandContext.Output.PrintError(statusErrorMessage);
            return new VaultUnlockResult(null, false);
        }

        return ResolveKek(vaultStatus, password);
    }

    private VaultUnlockResult ResolveKek(StatusResponse vaultStatus, string? password)
    {
        var kekSalt = vaultStatus.KekSalt!;

        if (vaultState.IsUnlocked && vaultState.KekSalt != kekSalt)
        {
            Spectre.Console.AnsiConsole.MarkupLine(
                "[yellow]Vault password appears to have changed elsewhere -- re-unlocking.[/]");
            vaultState.Lock();
        }

        var droppedStaleSession = TryLoadRememberedUnlock(vaultStatus, kekSalt);
        if (vaultState.IsUnlocked)
        {
            return new VaultUnlockResult(vaultState.Kek, droppedStaleSession);
        }

        if (string.IsNullOrEmpty(password))
        {
            if (!(droppedStaleSession && commandContext.Prompter.IsInteractive))
            {
                commandContext.Output.PrintError("Vault password required. Run 'unlock' or set DEPVAULT_PASSWORD.");
            }

            return new VaultUnlockResult(null, droppedStaleSession);
        }

        var salt = Convert.FromBase64String(kekSalt);
        var iterations = vaultStatus.KekIterations > 0 ? vaultStatus.KekIterations.Value : 600_000;
        var kek = VaultCrypto.DeriveKek(password, salt, iterations);

        if (!VaultCrypto.VerifyKek(
                vaultStatus.WrappedPrivateKey ?? "", vaultStatus.WrappedPrivateKeyIv ?? "",
                vaultStatus.WrappedPrivateKeyTag ?? "", kek))
        {
            CryptographicOperations.ZeroMemory(kek);
            commandContext.Output.PrintError("Incorrect vault password.");
            return new VaultUnlockResult(null, droppedStaleSession);
        }

        vaultState.Unlock(kek, kekSalt);
        return new VaultUnlockResult(kek, droppedStaleSession);
    }

    private bool TryLoadRememberedUnlock(StatusResponse vaultStatus, string kekSalt)
    {
        if (vaultState.IsUnlocked)
        {
            return false;
        }

        var persisted = rememberedUnlockService.TryLoad();
        if (persisted is null)
        {
            return false;
        }

        var (persistedKek, persistedSalt) = persisted.Value;
        if (persistedSalt != kekSalt
            || !VaultCrypto.VerifyKek(
                vaultStatus.WrappedPrivateKey ?? "", vaultStatus.WrappedPrivateKeyIv ?? "",
                vaultStatus.WrappedPrivateKeyTag ?? "", persistedKek))
        {
            rememberedUnlockService.Clear();
            CryptographicOperations.ZeroMemory(persistedKek);
            return true;
        }

        vaultState.Unlock(persistedKek, kekSalt);
        return false;
    }
}
