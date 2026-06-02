using System.Text;

namespace DepVault.Cli.Services;

/// <summary>
/// Heuristically classifies file content as binary vs. text so the CLI can flag blobs
/// that must not be treated as editable text on pull/restore.
/// </summary>
internal static class BinaryDetector
{
    private const int SampleSize = 8 * 1024;

    /// <summary>
    /// Returns true when <paramref name="bytes"/> looks binary: a NUL (0x00) byte appears
    /// in the first ~8KB, or the content is not valid UTF-8.
    /// </summary>
    public static bool IsBinary(byte[] bytes)
    {
        if (bytes.Length == 0)
        {
            return false;
        }

        var sampleLength = Math.Min(bytes.Length, SampleSize);

        for (var i = 0; i < sampleLength; i++)
        {
            if (bytes[i] == 0x00)
            {
                return true;
            }
        }

        return !IsValidUtf8(bytes);
    }

    /// <summary>Validates the whole buffer as UTF-8, rejecting invalid byte sequences.</summary>
    private static bool IsValidUtf8(byte[] bytes)
    {
        try
        {
            // Throw-on-invalid decoder: any malformed sequence surfaces as an exception.
            var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);
            encoding.GetString(bytes);
            return true;
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
