using System.Runtime.Versioning;
using System.Security.Cryptography;

namespace DepVault.Cli.Crypto;

/// <summary>Encrypts the vault KEK at rest so a remembered unlock can survive between invocations.</summary>
public interface IKekProtector
{
    /// <summary>Encrypts the KEK, returning a base64 envelope only this user/machine can open.</summary>
    string Protect(byte[] kek);

    /// <summary>Decrypts an envelope, or null on any failure (tamper, wrong user, corrupt).</summary>
    byte[]? Unprotect(string protectedBlob);

    /// <summary>Discards local protector material so prior envelopes can no longer be opened.</summary>
    void Reset();
}

/// <summary>DPAPI protector (CurrentUser scope) — bound to the Windows user account. AOT-safe P/Invoke.</summary>
[SupportedOSPlatform("windows")]
public sealed class WindowsKekProtector : IKekProtector
{
    public string Protect(byte[] kek)
    {
        var blob = ProtectedData.Protect(kek, optionalEntropy: null, DataProtectionScope.CurrentUser);
        return Convert.ToBase64String(blob);
    }

    public byte[]? Unprotect(string protectedBlob)
    {
        try
        {
            var blob = Convert.FromBase64String(protectedBlob);
            return ProtectedData.Unprotect(blob, optionalEntropy: null, DataProtectionScope.CurrentUser);
        }
        catch (Exception ex) when (ex is CryptographicException or FormatException)
        {
            return null;
        }
    }

    /// <summary>DPAPI keeps no local material — nothing to discard.</summary>
    public void Reset()
    {
    }
}

/// <summary>
/// macOS/Linux protector (no DPAPI): AES-GCM wraps the KEK under a random owner-only (0600)
/// <c>vault-protector.key</c>, so the session file is useless without the sibling key.
/// </summary>
public sealed class PosixKekProtector : IKekProtector
{
    private static readonly string ProtectorKeyPath = Path.Combine(Constants.ConfigDir, "vault-protector.key");

    public string Protect(byte[] kek)
    {
        var protectorKey = LoadOrCreateProtectorKey();
        var (wrapped, iv, tag) = VaultCrypto.WrapKey(kek, protectorKey);
        CryptographicOperations.ZeroMemory(protectorKey);
        return $"{wrapped}.{iv}.{tag}";
    }

    public byte[]? Unprotect(string protectedBlob)
    {
        var parts = protectedBlob.Split('.');
        if (parts.Length != 3 || !File.Exists(ProtectorKeyPath))
        {
            return null;
        }

        byte[]? protectorKey = null;
        try
        {
            protectorKey = Convert.FromBase64String(File.ReadAllText(ProtectorKeyPath));
            return VaultCrypto.UnwrapKey(parts[0], parts[1], parts[2], protectorKey);
        }
        catch (Exception ex)
            when (ex is CryptographicException or FormatException
                or IOException or UnauthorizedAccessException)
        {
            return null;
        }
        finally
        {
            if (protectorKey is not null)
            {
                CryptographicOperations.ZeroMemory(protectorKey);
            }
        }
    }

    public void Reset()
    {
        try
        {
            File.Delete(ProtectorKeyPath);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
        }
    }

    private static byte[] LoadOrCreateProtectorKey()
    {
        if (File.Exists(ProtectorKeyPath))
        {
            try
            {
                var existing = Convert.FromBase64String(File.ReadAllText(ProtectorKeyPath));
                if (existing.Length == 32)
                {
                    return existing;
                }
            }
            catch (FormatException)
            {
                // Corrupt key file — fall through and regenerate rather than crashing Protect.
            }
        }

        var key = RandomNumberGenerator.GetBytes(32);
        SecureFileWriter.WriteOwnerOnly(ProtectorKeyPath, Convert.ToBase64String(key));
        return key;
    }
}
