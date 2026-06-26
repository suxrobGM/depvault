using System.Security.Cryptography;
using DepVault.Cli.Crypto;

namespace DepVault.Cli.Tests.Crypto;

/// <summary>Tests the remembered-unlock store: round-trip, expiry, corruption, and clear. Uses an identity protector for determinism.</summary>
public sealed class PersistentVaultStoreTests : IDisposable
{
    private readonly string _dir;
    private readonly string _sessionPath;
    private readonly PersistentVaultStore _store;

    public PersistentVaultStoreTests()
    {
        _dir = Path.Combine(Path.GetTempPath(), "depvault-pvs-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_dir);
        _sessionPath = Path.Combine(_dir, "vault-session.json");
        _store = new PersistentVaultStore(new IdentityKekProtector(), _sessionPath);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_dir))
            {
                Directory.Delete(_dir, recursive: true);
            }
        }
        catch
        {
            // Best-effort temp cleanup.
        }
    }

    private static byte[] Kek() => RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void Save_Then_TryLoad_RoundTripsKekAndSalt()
    {
        var kek = Kek();
        _store.Save(kek, "salt-abc", DateTimeOffset.UtcNow.AddDays(7));

        // Fresh instance reads from disk — no in-memory cache shortcut.
        var fresh = new PersistentVaultStore(new IdentityKekProtector(), _sessionPath);
        var loaded = fresh.TryLoad();

        Assert.NotNull(loaded);
        Assert.Equal(kek, loaded.Value.Kek);
        Assert.Equal("salt-abc", loaded.Value.KekSalt);
    }

    [Fact]
    public void TryLoad_Expired_ReturnsNull_AndDeletesFile()
    {
        _store.Save(Kek(), "salt", DateTimeOffset.UtcNow.AddSeconds(-1));

        var fresh = new PersistentVaultStore(new IdentityKekProtector(), _sessionPath);
        Assert.Null(fresh.TryLoad());
        Assert.False(File.Exists(_sessionPath));
    }

    [Fact]
    public void HasSession_TrueWhenValid_FalseWhenExpiredOrMissing()
    {
        Assert.False(_store.HasSession());

        _store.Save(Kek(), "salt", DateTimeOffset.UtcNow.AddHours(1));
        Assert.True(new PersistentVaultStore(new IdentityKekProtector(), _sessionPath).HasSession());

        _store.Save(Kek(), "salt", DateTimeOffset.UtcNow.AddSeconds(-1));
        Assert.False(new PersistentVaultStore(new IdentityKekProtector(), _sessionPath).HasSession());
    }

    [Fact]
    public void TryLoad_CorruptJson_ReturnsNull()
    {
        File.WriteAllText(_sessionPath, "{ this is not valid json ");
        Assert.Null(new PersistentVaultStore(new IdentityKekProtector(), _sessionPath).TryLoad());
    }

    [Fact]
    public void HasSession_UnreadableOrCorruptFile_ReturnsFalseWithoutThrowing()
    {
        File.WriteAllText(_sessionPath, "{ this is not valid json ");
        using var _ = new FileStream(_sessionPath, FileMode.Open, FileAccess.Read, FileShare.None);

        var store = new PersistentVaultStore(new IdentityKekProtector(), _sessionPath);
        var ex = Record.Exception(() => Assert.False(store.HasSession()));

        Assert.Null(ex);
    }

    [Fact]
    public void TryLoad_UnprotectFails_ReturnsNull_AndClears()
    {
        // A non-expired session whose protected blob can't be unprotected (here: not valid base64).
        var future = DateTimeOffset.UtcNow.AddHours(1).ToString("o");
        File.WriteAllText(_sessionPath,
            $"{{\"protectedKek\":\"!!!not-base64!!!\",\"kekSalt\":\"salt\",\"expiresAt\":\"{future}\"}}");

        Assert.Null(new PersistentVaultStore(new IdentityKekProtector(), _sessionPath).TryLoad());
        Assert.False(File.Exists(_sessionPath)); // stale/untrusted session is cleared
    }

    [Fact]
    public void Clear_RemovesSessionFile()
    {
        _store.Save(Kek(), "salt", DateTimeOffset.UtcNow.AddHours(1));
        Assert.True(File.Exists(_sessionPath));

        _store.Clear();
        Assert.False(File.Exists(_sessionPath));
        Assert.False(_store.HasSession());
    }
}
