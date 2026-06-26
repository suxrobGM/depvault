using System.Security.Cryptography;

namespace DepVault.Cli.Crypto;

/// <summary>In-memory vault state: KEK, DEK cache, and auto-lock tracking.</summary>
public sealed class VaultState
{
    private byte[]? kek;
    private string? kekSalt;
    private readonly Dictionary<string, byte[]> dekCache = [];
    private DateTime lastActivity = DateTime.UtcNow;

    public bool IsUnlocked => kek is not null;

    /// <summary>Returns the cached KEK, or null if locked.</summary>
    public byte[]? Kek => kek;

    /// <summary>Base64 salt that was used to derive the currently cached KEK, or null if locked.</summary>
    public string? KekSalt => kekSalt;

    /// <summary>
    /// Store the KEK alongside the salt used to derive it. The salt lets callers detect when the
    /// server-side vault salt has rotated (password change on another client) and invalidate the
    /// cached KEK before it is used to wrap new grants.
    /// </summary>
    public void Unlock(byte[] kek, string salt)
    {
        this.kek = kek;
        kekSalt = salt;
        dekCache.Clear();
        lastActivity = DateTime.UtcNow;
    }

    /// <summary>Zero the KEK, clear DEK cache, and mark vault as locked.</summary>
    public void Lock()
    {
        if (kek is not null)
        {
            CryptographicOperations.ZeroMemory(kek);
            kek = null;
        }

        foreach (var dek in dekCache.Values)
        {
            CryptographicOperations.ZeroMemory(dek);
        }

        dekCache.Clear();
        kekSalt = null;
    }

    /// <summary>Cache a resolved DEK for a project.</summary>
    public void CacheDek(string projectId, byte[] dek)
    {
        dekCache[projectId] = dek;
        lastActivity = DateTime.UtcNow;
    }

    /// <summary>Retrieve a cached DEK, or null if not cached.</summary>
    public byte[]? GetCachedDek(string projectId)
    {
        lastActivity = DateTime.UtcNow;
        return dekCache.GetValueOrDefault(projectId);
    }

    /// <summary>If idle longer than the timeout, auto-lock the vault.</summary>
    public void CheckAutoLock(TimeSpan timeout)
    {
        if (kek is not null && DateTime.UtcNow - lastActivity > timeout)
        {
            Lock();
        }
    }
}
