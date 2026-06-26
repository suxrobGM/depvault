namespace DepVault.Cli.Crypto;

/// <summary>Writes secret-bearing files (KEK envelope, protector key) readable only by the owner.</summary>
internal static class SecureFileWriter
{
    /// <summary>
    /// Writes <paramref name="contents"/> to a file that is owner-only on POSIX. The restrictive mode is
    /// applied to the (pre-created, empty) file <em>before</em> the secret is written, so the bytes are
    /// never world-readable even momentarily; the parent directory is locked to the owner too. On
    /// Windows, ACL inheritance from the user profile directory is relied upon (DPAPI also binds the blob
    /// to the account), matching the existing credential/config stores.
    /// </summary>
    public static void WriteOwnerOnly(string path, string contents)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(
                    dir, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            }
        }

        if (!OperatingSystem.IsWindows() && !File.Exists(path))
        {
            using (File.Create(path))
            {
            }

            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }

        File.WriteAllText(path, contents);

        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
    }
}
