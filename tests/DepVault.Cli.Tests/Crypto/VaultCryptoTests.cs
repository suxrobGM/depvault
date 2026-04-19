using System.Security.Cryptography;
using System.Text;
using DepVault.Cli.Crypto;

namespace DepVault.Cli.Tests.Crypto;

/// <summary>
/// Tests for the CLI's static AES-256-GCM / PBKDF2 / HKDF primitives.
///
/// These tests pin down the ciphertext contract: base64 encoding, 12-byte IV, 16-byte tag,
/// 32-byte DEK, PBKDF2-SHA256 with 600k iterations, HKDF-SHA256 with info "depvault-ci-wrap".
/// Any drift here would cause existing user vaults (encrypted on a previous CLI version) to
/// become undecryptable — a data-loss bug — so the tests are tight against these constants.
/// </summary>
public class VaultCryptoTests
{
    // PBKDF2 is deliberately slow for security. For unit tests we verify determinism
    // and correctness with a small iteration count to keep the suite fast, then assert
    // the production constant (600k) is enforced by the VaultCrypto defaults separately.
    private const int FastIterations = 1_000;

    private static byte[] RandomKey() => RandomNumberGenerator.GetBytes(32);
    private static byte[] RandomSalt() => RandomNumberGenerator.GetBytes(16);

    // ─── Encrypt / Decrypt ────────────────────────────────────────────────────

    [Fact]
    public void Encrypt_Decrypt_RoundTrips_SimpleString()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("hello world", key);
        Assert.Equal("hello world", VaultCrypto.Decrypt(ct, iv, tag, key));
    }

    [Fact]
    public void Encrypt_Decrypt_RoundTrips_EmptyString()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("", key);
        Assert.Equal("", VaultCrypto.Decrypt(ct, iv, tag, key));
    }

    [Fact]
    public void Encrypt_Decrypt_RoundTrips_Unicode()
    {
        var key = RandomKey();
        const string text = "Hello 🌍🔐 你好世界 こんにちは";
        var (ct, iv, tag) = VaultCrypto.Encrypt(text, key);
        Assert.Equal(text, VaultCrypto.Decrypt(ct, iv, tag, key));
    }

    [Fact]
    public void Encrypt_Decrypt_RoundTrips_LargeString()
    {
        var key = RandomKey();
        var text = new string('A', 50_000);
        var (ct, iv, tag) = VaultCrypto.Encrypt(text, key);
        Assert.Equal(text, VaultCrypto.Decrypt(ct, iv, tag, key));
    }

    [Fact]
    public void Encrypt_Decrypt_RoundTrips_StringContainingNullAndControlChars()
    {
        var key = RandomKey();
        const string text = "line1\nline2\tthree\0four\r\nfive";
        var (ct, iv, tag) = VaultCrypto.Encrypt(text, key);
        Assert.Equal(text, VaultCrypto.Decrypt(ct, iv, tag, key));
    }

    [Fact]
    public void Encrypt_SamePlaintext_ProducesDifferentCiphertext_BecauseOfRandomIv()
    {
        var key = RandomKey();
        var a = VaultCrypto.Encrypt("same", key);
        var b = VaultCrypto.Encrypt("same", key);
        Assert.NotEqual(a.Ciphertext, b.Ciphertext);
        Assert.NotEqual(a.Iv, b.Iv);
    }

    [Fact]
    public void Encrypt_OutputsBase64_ForAllThreeFields()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("abc", key);
        // Will throw if not base64 — canonical contract with the server
        Assert.NotNull(Convert.FromBase64String(ct));
        var ivBytes = Convert.FromBase64String(iv);
        var tagBytes = Convert.FromBase64String(tag);
        Assert.Equal(12, ivBytes.Length);
        Assert.Equal(16, tagBytes.Length);
    }

    [Fact]
    public void Encrypt_CiphertextBytes_MatchPlaintextLength()
    {
        // GCM is a stream cipher — ciphertext length must equal plaintext length (tag is separate).
        // If this ever changes, decryption on the frontend (which expects the same contract) breaks.
        var key = RandomKey();
        var plaintext = "1234567890";
        var (ct, _, _) = VaultCrypto.Encrypt(plaintext, key);
        var ctBytes = Convert.FromBase64String(ct);
        Assert.Equal(Encoding.UTF8.GetByteCount(plaintext), ctBytes.Length);
    }

    [Fact]
    public void Decrypt_WithWrongKey_Throws()
    {
        var keyA = RandomKey();
        var keyB = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("secret", keyA);
        // AuthenticationTagMismatchException derives from CryptographicException — we assert
        // the subclass so a regression that swallows tags silently would fail loudly.
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(ct, iv, tag, keyB));
    }

    [Fact]
    public void Decrypt_WithTamperedCiphertext_Throws()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("secret", key);
        var bytes = Convert.FromBase64String(ct);
        bytes[0] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(tampered, iv, tag, key));
    }

    [Fact]
    public void Decrypt_WithTamperedAuthTag_Throws()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("secret", key);
        var bytes = Convert.FromBase64String(tag);
        bytes[0] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(ct, iv, tampered, key));
    }

    [Fact]
    public void Decrypt_WithTamperedIv_Throws()
    {
        var key = RandomKey();
        var (ct, iv, tag) = VaultCrypto.Encrypt("secret", key);
        var bytes = Convert.FromBase64String(iv);
        bytes[0] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(ct, tampered, tag, key));
    }

    [Fact]
    public void Decrypt_WithSwappedFieldsAcrossTwoEncryptions_Throws()
    {
        // If a developer accidentally swaps (iv, tag) between different rows in the database,
        // GCM's auth tag must reject — this catches stored-data mix-ups.
        var key = RandomKey();
        var a = VaultCrypto.Encrypt("alpha", key);
        var b = VaultCrypto.Encrypt("bravo", key);
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(a.Ciphertext, b.Iv, a.AuthTag, key));
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.Decrypt(a.Ciphertext, a.Iv, b.AuthTag, key));
    }

    [Theory]
    [InlineData(16)]
    [InlineData(24)]
    public void Encrypt_WithSmallerKey_DoesNotInteropWith32ByteKey(int keyLen)
    {
        // The DepVault contract is strictly 256-bit keys. A smaller AES-128/192 key would be
        // accepted by AesGcm but MUST NOT be interchangeable with a 256-bit key — otherwise a
        // buggy caller could downgrade silently and data wrapped under a short key would be
        // unreadable from a normal 256-bit flow.
        var badKey = RandomNumberGenerator.GetBytes(keyLen);
        var (ct, iv, tag) = VaultCrypto.Encrypt("x", badKey);
        var correct32 = RandomKey();
        Assert.ThrowsAny<CryptographicException>(() => VaultCrypto.Decrypt(ct, iv, tag, correct32));
    }

    [Fact]
    public void DecryptBytes_RoundTripsBinary()
    {
        var key = RandomKey();
        // Encrypt raw bytes via string path — verify DecryptBytes returns identical bytes
        var (ct, iv, tag) = VaultCrypto.Encrypt("bytes-in-string", key);
        var bytes = VaultCrypto.DecryptBytes(ct, iv, tag, key);
        Assert.Equal(Encoding.UTF8.GetBytes("bytes-in-string"), bytes);
    }

    // ─── PBKDF2 / KEK Derivation ─────────────────────────────────────────────

    [Fact]
    public void DeriveKek_Deterministic_ForSamePassword_SaltAndIterations()
    {
        var salt = RandomSalt();
        var a = VaultCrypto.DeriveKek("pw", salt, FastIterations);
        var b = VaultCrypto.DeriveKek("pw", salt, FastIterations);
        Assert.Equal(a, b);
    }

    [Fact]
    public void DeriveKek_ReturnsThirtyTwoBytes()
    {
        var kek = VaultCrypto.DeriveKek("pw", RandomSalt(), FastIterations);
        Assert.Equal(32, kek.Length);
    }

    [Fact]
    public void DeriveKek_DifferentPassword_ProducesDifferentKey()
    {
        var salt = RandomSalt();
        var a = VaultCrypto.DeriveKek("pw-a", salt, FastIterations);
        var b = VaultCrypto.DeriveKek("pw-b", salt, FastIterations);
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void DeriveKek_DifferentSalt_ProducesDifferentKey()
    {
        var a = VaultCrypto.DeriveKek("pw", RandomSalt(), FastIterations);
        var b = VaultCrypto.DeriveKek("pw", RandomSalt(), FastIterations);
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void DeriveKek_DifferentIterations_ProducesDifferentKey()
    {
        // A bug that ignored the iterations parameter would derive the same KEK for different
        // values and silently corrupt vaults whose iteration count has been upgraded.
        var salt = RandomSalt();
        var a = VaultCrypto.DeriveKek("pw", salt, 1_000);
        var b = VaultCrypto.DeriveKek("pw", salt, 2_000);
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void DeriveKek_DefaultIterations_Is_600k()
    {
        // The production constant is 600k. Tightening the default in code without a migration
        // would orphan every existing user vault. Guard the default explicitly.
        var salt = RandomSalt();
        var derivedWith600k = VaultCrypto.DeriveKek("pw", salt, 600_000);
        var derivedWithDefault = VaultCrypto.DeriveKek("pw", salt);
        Assert.Equal(derivedWith600k, derivedWithDefault);
    }

    [Fact]
    public void DeriveKek_HandlesUnicodePasswords()
    {
        var salt = RandomSalt();
        var pw = "p@ss🔐wörd\u00A0مرحبا";
        var kek = VaultCrypto.DeriveKek(pw, salt, FastIterations);
        Assert.Equal(32, kek.Length);
        // Must be re-derivable
        Assert.Equal(kek, VaultCrypto.DeriveKek(pw, salt, FastIterations));
    }

    [Fact]
    public void DeriveKek_EmptyPassword_Succeeds_ButUnique()
    {
        // An empty password is a terrible user choice but must not crash — the CLI just treats
        // it as a weak key. What matters is that it's deterministic and distinct from a real one.
        var salt = RandomSalt();
        var a = VaultCrypto.DeriveKek("", salt, FastIterations);
        var b = VaultCrypto.DeriveKek("", salt, FastIterations);
        var c = VaultCrypto.DeriveKek("non-empty", salt, FastIterations);
        Assert.Equal(a, b);
        Assert.NotEqual(a, c);
    }

    // ─── HKDF CI Wrap Key ────────────────────────────────────────────────────

    [Fact]
    public void DeriveCiWrapKey_Deterministic_ForSameToken()
    {
        var a = VaultCrypto.DeriveCiWrapKey("ci-token-abc-123");
        var b = VaultCrypto.DeriveCiWrapKey("ci-token-abc-123");
        Assert.Equal(a, b);
    }

    [Fact]
    public void DeriveCiWrapKey_ReturnsThirtyTwoBytes()
    {
        var key = VaultCrypto.DeriveCiWrapKey("tok");
        Assert.Equal(32, key.Length);
    }

    [Fact]
    public void DeriveCiWrapKey_DifferentTokens_ProduceDifferentKeys()
    {
        var a = VaultCrypto.DeriveCiWrapKey("token-one");
        var b = VaultCrypto.DeriveCiWrapKey("token-two");
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void DeriveCiWrapKey_UsesInfoString_DepvaultCiWrap()
    {
        // Re-derive the key manually with the exact info bytes and compare. If anyone changes
        // the info string, the CLI can no longer unwrap DEKs sent by the frontend (and vice
        // versa) — a breakage that would silently block every CI pipeline.
        var token = "token-xyz";
        var expected = HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            Encoding.UTF8.GetBytes(token),
            32,
            salt: [],
            info: Encoding.UTF8.GetBytes("depvault-ci-wrap"));
        Assert.Equal(expected, VaultCrypto.DeriveCiWrapKey(token));
    }

    // ─── Wrap / Unwrap ────────────────────────────────────────────────────────

    [Fact]
    public void WrapKey_UnwrapKey_RoundTripsDek()
    {
        var wrapping = RandomKey();
        var dek = RandomKey();
        var (wrapped, iv, tag) = VaultCrypto.WrapKey(dek, wrapping);
        var unwrapped = VaultCrypto.UnwrapKey(wrapped, iv, tag, wrapping);
        Assert.Equal(dek, unwrapped);
    }

    [Fact]
    public void WrapKey_UsesFreshIv_ForEachCall()
    {
        var wrapping = RandomKey();
        var dek = RandomKey();
        var a = VaultCrypto.WrapKey(dek, wrapping);
        var b = VaultCrypto.WrapKey(dek, wrapping);
        Assert.NotEqual(a.Iv, b.Iv);
        Assert.NotEqual(a.WrappedDek, b.WrappedDek);
    }

    [Fact]
    public void UnwrapKey_WithWrongWrappingKey_Throws()
    {
        var dek = RandomKey();
        var (wrapped, iv, tag) = VaultCrypto.WrapKey(dek, RandomKey());
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.UnwrapKey(wrapped, iv, tag, RandomKey()));
    }

    [Fact]
    public void UnwrapKey_WithTamperedWrappedBytes_Throws()
    {
        var wrapping = RandomKey();
        var dek = RandomKey();
        var (wrapped, iv, tag) = VaultCrypto.WrapKey(dek, wrapping);
        var bytes = Convert.FromBase64String(wrapped);
        bytes[0] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);
        Assert.Throws<AuthenticationTagMismatchException>(() => VaultCrypto.UnwrapKey(tampered, iv, tag, wrapping));
    }

    [Fact]
    public void WrapKey_OutputIvIsTwelveBytes_TagIsSixteen()
    {
        var (_, iv, tag) = VaultCrypto.WrapKey(RandomKey(), RandomKey());
        Assert.Equal(12, Convert.FromBase64String(iv).Length);
        Assert.Equal(16, Convert.FromBase64String(tag).Length);
    }

    [Fact]
    public void WrapKey_PreservesDekLength_ThirtyTwoByteCiphertext()
    {
        // The wrapped DEK ciphertext must be the same length as the raw DEK (32 bytes).
        // The tag is returned separately, not appended — any concatenation bug would double
        // the expected size and desync the frontend's unwrap logic.
        var (wrapped, _, _) = VaultCrypto.WrapKey(RandomKey(), RandomKey());
        Assert.Equal(32, Convert.FromBase64String(wrapped).Length);
    }

    [Fact]
    public void UnwrapKey_ThenEncrypt_YieldsUsableKey()
    {
        var wrapping = RandomKey();
        var originalDek = RandomKey();
        var (wrapped, iv, tag) = VaultCrypto.WrapKey(originalDek, wrapping);
        var unwrapped = VaultCrypto.UnwrapKey(wrapped, iv, tag, wrapping);

        var (ct, eIv, eTag) = VaultCrypto.Encrypt("secret payload", unwrapped);
        Assert.Equal("secret payload", VaultCrypto.Decrypt(ct, eIv, eTag, originalDek));
    }

    // ─── Edge cases / argument validation ────────────────────────────────────

    [Fact]
    public void Decrypt_WithMalformedBase64_Throws()
    {
        var key = RandomKey();
        Assert.Throws<FormatException>(() => VaultCrypto.Decrypt("!!not-base64!!", "AAAA", "AAAA", key));
    }

    [Fact]
    public void Decrypt_WithEmptyStringFields_Throws()
    {
        var key = RandomKey();
        // Empty is valid base64 (decodes to 0 bytes) but the IV and tag lengths are wrong.
        Assert.ThrowsAny<Exception>(() => VaultCrypto.Decrypt("", "", "", key));
    }
}
