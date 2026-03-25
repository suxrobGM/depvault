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

    /// <summary>AES-256-GCM encrypt a plaintext string, returning base64-encoded (ciphertext, iv, authTag).</summary>
    public static (string Ciphertext, string Iv, string AuthTag) Encrypt(string plaintext, byte[] key)
    {
        var iv = RandomNumberGenerator.GetBytes(IvBytes);
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[TagBytes];

        using var aes = new AesGcm(key, TagBytes);
        aes.Encrypt(iv, plaintextBytes, ciphertext, tag);

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
