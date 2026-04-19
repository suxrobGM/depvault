using System.Security.Cryptography;
using DepVault.Cli.Crypto;

namespace DepVault.Cli.Tests.Crypto;

/// <summary>
/// Tests for in-memory vault state handling: KEK caching, DEK cache, auto-lock, and
/// cryptographic-memory zeroing on lock.
///
/// A bug here could cause two serious problems:
///   1. Stale KEK used to wrap new grants after a password change on another client
///      (resulting in future decrypts failing / data loss).
///   2. Key material lingering in process memory after lock — weakens the security model.
/// </summary>
public class VaultStateTests
{
    private static byte[] Kek() => RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void NewState_IsLocked_NoKek_NoSalt()
    {
        var state = new VaultState();
        Assert.False(state.IsUnlocked);
        Assert.Null(state.Kek);
        Assert.Null(state.KekSalt);
    }

    [Fact]
    public void Unlock_CachesKek_AndSalt()
    {
        var state = new VaultState();
        var kek = Kek();
        state.Unlock(kek, "salt-base64-value");

        Assert.True(state.IsUnlocked);
        Assert.Same(kek, state.Kek);
        Assert.Equal("salt-base64-value", state.KekSalt);
    }

    [Fact]
    public void Unlock_Replaces_PreviousState_AndClearsDekCache()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt-1");
        state.CacheDek("proj-1", RandomNumberGenerator.GetBytes(32));

        // New unlock (after password change, say) wipes the old DEK cache — otherwise the
        // next pull would return a DEK wrapped by a stale KEK.
        state.Unlock(Kek(), "salt-2");
        Assert.Null(state.GetCachedDek("proj-1"));
    }

    [Fact]
    public void Lock_ZeroesKek_Bytes_InPlace()
    {
        var state = new VaultState();
        var kek = new byte[32];
        new Random(1234).NextBytes(kek);
        var originalCopy = (byte[])kek.Clone();
        // Sanity: the reference we pass in is non-zero before lock
        Assert.Contains(kek, b => b != 0);

        state.Unlock(kek, "salt");
        state.Lock();

        // After lock, the caller's byte[] reference must be zeroed — no key material in memory
        Assert.All(kek, b => Assert.Equal(0, b));
        Assert.NotEqual(originalCopy, kek);
    }

    [Fact]
    public void Lock_ClearsCachedDeks_AndZeroesTheirBytes()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        var dek = new byte[32];
        new Random(42).NextBytes(dek);
        state.CacheDek("proj-1", dek);

        state.Lock();

        // Caller's DEK reference must be zeroed (matches the KEK zero-on-lock contract)
        Assert.All(dek, b => Assert.Equal(0, b));

        // And the cache itself must be empty so a subsequent unlock starts fresh
        Assert.Null(state.GetCachedDek("proj-1"));
    }

    [Fact]
    public void Lock_SetsIsUnlockedFalse_AndNullsSalt()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");
        state.Lock();

        Assert.False(state.IsUnlocked);
        Assert.Null(state.Kek);
        Assert.Null(state.KekSalt);
    }

    [Fact]
    public void Lock_WhenAlreadyLocked_IsIdempotent()
    {
        var state = new VaultState();
        state.Lock(); // should not throw on a never-unlocked state
        state.Lock();
        Assert.False(state.IsUnlocked);
    }

    [Fact]
    public void CacheDek_Then_Get_ReturnsCachedInstance()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        var dek = RandomNumberGenerator.GetBytes(32);
        state.CacheDek("proj-1", dek);
        Assert.Same(dek, state.GetCachedDek("proj-1"));
    }

    [Fact]
    public void CacheDek_Overwrites_PreviousEntry()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");
        var oldDek = RandomNumberGenerator.GetBytes(32);
        var newDek = RandomNumberGenerator.GetBytes(32);
        state.CacheDek("proj-1", oldDek);
        state.CacheDek("proj-1", newDek);
        Assert.Same(newDek, state.GetCachedDek("proj-1"));
    }

    [Fact]
    public void GetCachedDek_UnknownProject_ReturnsNull()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");
        Assert.Null(state.GetCachedDek("never-cached"));
    }

    [Fact]
    public void CheckAutoLock_WithinTimeout_DoesNotLock()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        state.CheckAutoLock(TimeSpan.FromMinutes(30));
        Assert.True(state.IsUnlocked);
    }

    [Fact]
    public void CheckAutoLock_AfterTimeout_LocksAndZeroesKek()
    {
        var state = new VaultState();
        var kek = new byte[32];
        new Random(7).NextBytes(kek);
        state.Unlock(kek, "salt");

        // Use a negative timeout to force the elapsed check to trigger immediately
        state.CheckAutoLock(TimeSpan.FromMilliseconds(-1));
        Assert.False(state.IsUnlocked);
        Assert.All(kek, b => Assert.Equal(0, b));
    }

    [Fact]
    public void CheckAutoLock_DoesNothing_WhenAlreadyLocked()
    {
        var state = new VaultState();
        // Not unlocked — should be a no-op regardless of timeout
        state.CheckAutoLock(TimeSpan.FromMilliseconds(-1));
        Assert.False(state.IsUnlocked);
    }

    [Fact]
    public void GetCachedDek_RefreshesActivity_Preventing_AutoLock()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");
        state.CacheDek("proj-1", RandomNumberGenerator.GetBytes(32));

        // Use the cache, which bumps last-activity, then verify a normal positive timeout
        // leaves the vault unlocked (activity within window).
        _ = state.GetCachedDek("proj-1");
        state.CheckAutoLock(TimeSpan.FromSeconds(30));
        Assert.True(state.IsUnlocked);
    }

    [Fact]
    public void CacheDek_RefreshesActivity_Preventing_AutoLock()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        state.CacheDek("p", RandomNumberGenerator.GetBytes(32));
        state.CheckAutoLock(TimeSpan.FromSeconds(30));
        Assert.True(state.IsUnlocked);
    }

    // ─── Multi-project DEK cache: isolation & batch lifecycle ────────────────
    // These tests guard the realistic case: a user working across many projects in one
    // session. A bug that cross-contaminates DEKs or fails to zero one of them on lock
    // would leak key material OR hand back the wrong DEK for a pull, causing data loss.

    [Fact]
    public void CacheDek_MultipleProjects_AreIsolated_ByProjectId()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        var ids = new[] { "proj-a", "proj-b", "proj-c", "proj-d", "proj-e" };
        var deks = ids.ToDictionary(id => id, _ => RandomNumberGenerator.GetBytes(32));

        foreach (var (id, dek) in deks)
        {
            state.CacheDek(id, dek);
        }

        // Each cached DEK must be retrievable by its own id — no cross-contamination
        foreach (var (id, dek) in deks)
        {
            Assert.Same(dek, state.GetCachedDek(id));
        }

        // And pair-wise distinct
        foreach (var (idA, dekA) in deks)
        foreach (var (idB, dekB) in deks)
        {
            if (idA == idB) continue;
            Assert.NotEqual(dekA, dekB);
        }
    }

    [Fact]
    public void CacheDek_SameProjectId_OverwritesWithoutAffectingOtherProjects()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        var otherDek = RandomNumberGenerator.GetBytes(32);
        state.CacheDek("other", otherDek);

        var first = RandomNumberGenerator.GetBytes(32);
        state.CacheDek("target", first);
        var second = RandomNumberGenerator.GetBytes(32);
        state.CacheDek("target", second);

        Assert.Same(second, state.GetCachedDek("target"));
        Assert.Same(otherDek, state.GetCachedDek("other"));
    }

    [Fact]
    public void Lock_ZeroesEveryCachedDek_AcrossAllProjects()
    {
        var state = new VaultState();
        state.Unlock(Kek(), "salt");

        // Build a batch of non-zero DEKs (using deterministic seeds so the test is reproducible)
        var deks = new Dictionary<string, byte[]>();
        for (int i = 0; i < 10; i++)
        {
            var bytes = new byte[32];
            new Random(1000 + i).NextBytes(bytes);
            deks[$"proj-{i}"] = bytes;
            state.CacheDek($"proj-{i}", bytes);
        }

        state.Lock();

        // Every caller-held DEK reference must be zeroed — none may be skipped.
        // This is the defense-in-depth guarantee against memory scraping post-lock.
        foreach (var (id, bytes) in deks)
        {
            Assert.All(bytes, b => Assert.Equal(0, b));
        }
        // And the cache itself must be empty for every project
        foreach (var id in deks.Keys)
        {
            Assert.Null(state.GetCachedDek(id));
        }
    }

    [Fact]
    public void Unlock_AfterMultiProject_Session_ClearsAllPriorCachedDeks()
    {
        // Simulates password rotation elsewhere → VaultState.Unlock called again. The cache
        // from the old KEK must be wiped so we don't hand out DEKs wrapped by a stale KEK
        // that no longer matches the server's stored grants.
        var state = new VaultState();
        state.Unlock(Kek(), "old-salt");
        for (int i = 0; i < 5; i++)
        {
            state.CacheDek($"proj-{i}", RandomNumberGenerator.GetBytes(32));
        }

        state.Unlock(Kek(), "new-salt");

        for (int i = 0; i < 5; i++)
        {
            Assert.Null(state.GetCachedDek($"proj-{i}"));
        }
    }
}
