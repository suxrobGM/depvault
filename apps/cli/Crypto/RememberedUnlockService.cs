using DepVault.Cli.Auth;
using DepVault.Cli.Common;

namespace DepVault.Cli.Crypto;

/// <summary>Owns remembered-unlock TTL policy, prompts, and persistence.</summary>
public sealed class RememberedUnlockService(
    AuthContext commandContext,
    VaultState vaultState,
    IPersistentVaultStore persistentVaultStore)
{
    public bool HasSession() => persistentVaultStore.HasSession();

    public (byte[] Kek, string KekSalt)? TryLoad() => persistentVaultStore.TryLoad();

    public void Clear() => persistentVaultStore.Clear();

    public TimeSpan ResolveTtlOrDefault(string? ttlValue)
    {
        var resolved = DurationParser.ResolveTtl(ttlValue);
        if (resolved is not null)
        {
            return resolved.Value;
        }

        Spectre.Console.AnsiConsole.MarkupLine(
            $"[yellow]Invalid --ttl '{Spectre.Console.Markup.Escape(ttlValue ?? "")}', using default {DurationParser.DefaultTtl.TotalDays:0} days.[/]");
        return DurationParser.DefaultTtl;
    }

    public DateTimeOffset SaveCurrentUnlock(TimeSpan ttl)
    {
        if (vaultState.Kek is null || vaultState.KekSalt is null)
        {
            throw new InvalidOperationException("Vault must be unlocked before it can be remembered.");
        }

        var expiresAt = DateTimeOffset.UtcNow + ttl;
        persistentVaultStore.Save(vaultState.Kek, vaultState.KekSalt, expiresAt);
        return expiresAt;
    }

    /// <summary>
    /// Offers to persist the unlock (default 7d TTL). No-ops in CI, non-interactive, when locked, or when
    /// a session already exists.
    /// </summary>
    public void MaybeOfferRememberUnlock(TimeSpan? ttlOverride)
    {
        if (commandContext.IsCiMode() || !commandContext.Prompter.IsInteractive)
        {
            return;
        }

        if (!vaultState.IsUnlocked || vaultState.Kek is null || vaultState.KekSalt is null)
        {
            return;
        }

        if (HasSession())
        {
            return;
        }

        var ttl = ttlOverride ?? DurationParser.DefaultTtl;
        if (!commandContext.Prompter.Confirm(
                $"Keep this vault unlocked on this machine for {Humanize(ttl)}?",
                defaultValue: false))
        {
            return;
        }

        var expiresAt = SaveCurrentUnlock(ttl);
        commandContext.Output.PrintSuccess(
            $"Vault will stay unlocked on this machine until {expiresAt.LocalDateTime:g}.");
    }

    private static string Humanize(TimeSpan ttl)
    {
        if (ttl.TotalDays >= 1)
        {
            return $"{(int)Math.Round(ttl.TotalDays)} day(s)";
        }

        return ttl.TotalHours >= 1
            ? $"{(int)Math.Round(ttl.TotalHours)} hour(s)"
            : $"{(int)Math.Round(ttl.TotalMinutes)} minute(s)";
    }
}
