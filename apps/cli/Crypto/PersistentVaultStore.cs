using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepVault.Cli.Crypto;

/// <summary>On-disk record of a remembered vault unlock: the protected KEK, its salt, and an expiry.</summary>
public sealed class PersistedVaultSession
{
    [JsonPropertyName("protectedKek")]
    public string ProtectedKek { get; set; } = "";

    [JsonPropertyName("kekSalt")]
    public string KekSalt { get; set; } = "";

    [JsonPropertyName("expiresAt")]
    public DateTimeOffset ExpiresAt { get; set; }
}

public interface IPersistentVaultStore
{
    void Save(byte[] kek, string kekSalt, DateTimeOffset expiresAt);

    /// <summary>Loads the remembered KEK and salt, or null when missing/expired/corrupt/unprotect-fail (clearing stale ones).</summary>
    (byte[] Kek, string KekSalt)? TryLoad();

    /// <summary>Cheap existence + expiry check that does not unprotect (for the banner and prompt guards).</summary>
    bool HasSession();

    void Clear();
}

/// <summary>
/// Persists a remembered unlock to <c>~/.depvault/vault-session.json</c> — the derived KEK (never the
/// password) encrypted at rest. Mirrors the <c>CredentialStore</c> pattern (cache + source-gen JSON).
/// </summary>
public sealed class PersistentVaultStore : IPersistentVaultStore
{
    private readonly IKekProtector kekProtector;
    private readonly string sessionPath;

    private PersistedVaultSession? cached;
    private bool loaded;

    public PersistentVaultStore(IKekProtector kekProtector)
        : this(kekProtector, Path.Combine(Constants.ConfigDir, "vault-session.json"))
    {
    }

    /// <summary>Test seam: lets tests point the session file at an isolated path.</summary>
    internal PersistentVaultStore(IKekProtector kekProtector, string sessionPath)
    {
        this.kekProtector = kekProtector;
        this.sessionPath = sessionPath;
    }

    public void Save(byte[] kek, string kekSalt, DateTimeOffset expiresAt)
    {
        var session = new PersistedVaultSession
        {
            ProtectedKek = kekProtector.Protect(kek),
            KekSalt = kekSalt,
            ExpiresAt = expiresAt
        };

        var json = JsonSerializer.Serialize(session, VaultSessionJsonContext.Default.PersistedVaultSession);
        SecureFileWriter.WriteOwnerOnly(sessionPath, json);

        cached = session;
        loaded = true;
    }

    public (byte[] Kek, string KekSalt)? TryLoad()
    {
        var session = LoadFile();
        if (session is null)
        {
            return null;
        }

        if (DateTimeOffset.UtcNow >= session.ExpiresAt)
        {
            Clear();
            return null;
        }

        var kek = kekProtector.Unprotect(session.ProtectedKek);
        if (kek is null)
        {
            Clear();
            return null;
        }

        return (kek, session.KekSalt);
    }

    public bool HasSession()
    {
        var session = LoadFile();
        return session is not null && DateTimeOffset.UtcNow < session.ExpiresAt;
    }

    public void Clear()
    {
        try
        {
            File.Delete(sessionPath);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
        }

        kekProtector.Reset();
        cached = null;
        loaded = true;
    }

    private PersistedVaultSession? LoadFile()
    {
        if (loaded)
        {
            return cached;
        }

        loaded = true;

        if (!File.Exists(sessionPath))
        {
            return cached = null;
        }

        try
        {
            var json = File.ReadAllText(sessionPath);
            var session = JsonSerializer.Deserialize(json, VaultSessionJsonContext.Default.PersistedVaultSession);
            cached = string.IsNullOrEmpty(session?.ProtectedKek) ? null : session;
        }
        catch (Exception ex) when (ex is JsonException or IOException or UnauthorizedAccessException)
        {
            cached = null;
        }

        return cached;
    }
}

[JsonSerializable(typeof(PersistedVaultSession))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class VaultSessionJsonContext : JsonSerializerContext;
