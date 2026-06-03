using System.Security.Cryptography;
using System.Text;

namespace DepVault.Cli.Crypto;

/// <summary>AES-256-GCM encryption, PBKDF2 key derivation, and HKDF-based key wrapping for the vault.</summary>
public static class VaultCrypto
{
    private const int IvBytes = 12;
    private const int TagBytes = 16;
    private const int KeyBytes = 32;
    private static readonly byte[] HkdfInfo = "depvault-ci-wrap"u8.ToArray();
    private static readonly byte[] ContentTagInfo = "depvault-content-tag"u8.ToArray();

    /// <summary>AES-256-GCM encrypt a plaintext string, returning base64-encoded (ciphertext, iv, authTag).</summary>
    public static (string Ciphertext, string Iv, string AuthTag) Encrypt(string plaintext, byte[] key)
    {
        return EncryptBytes(Encoding.UTF8.GetBytes(plaintext), key);
    }

    /// <summary>AES-256-GCM encrypt raw bytes (e.g. a binary secret file), returning base64-encoded (ciphertext, iv, authTag).</summary>
    public static (string Ciphertext, string Iv, string AuthTag) EncryptBytes(byte[] plaintext, byte[] key)
    {
        var iv = RandomNumberGenerator.GetBytes(IvBytes);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagBytes];

        using var aes = new AesGcm(key, TagBytes);
        aes.Encrypt(iv, plaintext, ciphertext, tag);

        return (
            Convert.ToBase64String(ciphertext),
            Convert.ToBase64String(iv),
            Convert.ToBase64String(tag)
        );
    }

    /// <summary>AES-256-GCM decrypt base64-encoded ciphertext back to a UTF-8 string.</summary>
    public static string Decrypt(string ciphertext, string iv, string authTag, byte[] key)
    {
        var ciphertextBytes = Convert.FromBase64String(ciphertext);
        var ivBytes = Convert.FromBase64String(iv);
        var tagBytes = Convert.FromBase64String(authTag);
        var plaintext = new byte[ciphertextBytes.Length];

        using var aes = new AesGcm(key, TagBytes);
        aes.Decrypt(ivBytes, ciphertextBytes, tagBytes, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }

    /// <summary>AES-256-GCM decrypt base64-encoded ciphertext back to raw bytes.</summary>
    public static byte[] DecryptBytes(string ciphertext, string iv, string authTag, byte[] key)
    {
        var ciphertextBytes = Convert.FromBase64String(ciphertext);
        var ivBytes = Convert.FromBase64String(iv);
        var tagBytes = Convert.FromBase64String(authTag);
        var plaintext = new byte[ciphertextBytes.Length];

        using var aes = new AesGcm(key, TagBytes);
        aes.Decrypt(ivBytes, ciphertextBytes, tagBytes, plaintext);

        return plaintext;
    }

    /// <summary>Derive a KEK from a vault password using PBKDF2-SHA256.</summary>
    public static byte[] DeriveKek(string password, byte[] salt, int iterations = 600_000)
    {
        return Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, KeyBytes);
    }

    /// <summary>Derive a CI wrap key from a raw token using HKDF-SHA256 with info "depvault-ci-wrap".</summary>
    public static byte[] DeriveCiWrapKey(string rawToken)
    {
        var ikm = Encoding.UTF8.GetBytes(rawToken);
        return HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, KeyBytes, salt: [], info: HkdfInfo);
    }

    /// <summary>
    /// Computes a deterministic, keyed content tag for a file's plaintext: HMAC-SHA256 over the
    /// bytes with a tag key derived from the project DEK via HKDF (info "depvault-content-tag"). The
    /// tag is stable for identical content yet opaque to the server (which never holds the DEK), so
    /// the backend can detect an unchanged re-push without learning anything about the plaintext.
    /// Returns the base64-encoded tag.
    /// </summary>
    public static string ComputeContentTag(byte[] plaintext, byte[] dek)
    {
        var tagKey = HKDF.DeriveKey(HashAlgorithmName.SHA256, dek, KeyBytes, salt: [], info: ContentTagInfo);
        try
        {
            return Convert.ToBase64String(HMACSHA256.HashData(tagKey, plaintext));
        }
        finally
        {
            CryptographicOperations.ZeroMemory(tagKey);
        }
    }

    /// <summary>Wrap (AES-GCM encrypt) a raw DEK with a wrapping key, returning base64-encoded values.</summary>
    public static (string WrappedDek, string Iv, string Tag) WrapKey(byte[] dek, byte[] wrappingKey)
    {
        var iv = RandomNumberGenerator.GetBytes(IvBytes);
        var ciphertext = new byte[dek.Length];
        var tag = new byte[TagBytes];

        using var aes = new AesGcm(wrappingKey, TagBytes);
        aes.Encrypt(iv, dek, ciphertext, tag);

        return (
            Convert.ToBase64String(ciphertext),
            Convert.ToBase64String(iv),
            Convert.ToBase64String(tag)
        );
    }

    /// <summary>
    /// Verifies a candidate KEK by attempting to unwrap the server-stored wrapped private key.
    /// A successful unwrap proves the KEK was derived from the correct password and salt; an
    /// AES-GCM auth-tag mismatch proves it was not. Returns true when the wrapped key material is
    /// absent (can't verify against bad server state — allow through rather than block).
    /// </summary>
    public static bool VerifyKek(string wrappedKey, string iv, string tag, byte[] kek)
    {
        if (string.IsNullOrEmpty(wrappedKey) || string.IsNullOrEmpty(iv) || string.IsNullOrEmpty(tag))
        {
            return true;
        }

        try
        {
            var raw = UnwrapKey(wrappedKey, iv, tag, kek);
            CryptographicOperations.ZeroMemory(raw);
            return true;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }

    /// <summary>Unwrap (AES-GCM decrypt) a wrapped DEK, returning the raw key bytes.</summary>
    public static byte[] UnwrapKey(string wrappedDek, string iv, string tag, byte[] wrappingKey)
    {
        var ciphertextBytes = Convert.FromBase64String(wrappedDek);
        var ivBytes = Convert.FromBase64String(iv);
        var tagBytes = Convert.FromBase64String(tag);
        var dek = new byte[ciphertextBytes.Length];

        using var aes = new AesGcm(wrappingKey, TagBytes);
        aes.Decrypt(ivBytes, ciphertextBytes, tagBytes, dek);

        return dek;
    }
}
