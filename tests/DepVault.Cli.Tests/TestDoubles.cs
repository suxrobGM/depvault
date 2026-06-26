using DepVault.Cli.Crypto;
using DepVault.Cli.Output;

namespace DepVault.Cli.Tests;

/// <summary>No-op output formatter so service tests can assert behavior without console rendering.</summary>
internal sealed class NoOpOutput : IOutputFormatter
{
    public void PrintTable(string[] headers, List<string[]> rows) { }
    public void PrintJson(object data) { }
    public void PrintKeyValue(string key, string? value) { }
    public void PrintSuccess(string message) { }
    public void PrintError(string message) { }
    public void WriteContent(string content, string? outputPath) { }
}

/// <summary>Error handler that always lets a per-file loop continue (no auth/plan-limit special-casing).</summary>
internal sealed class ContinueErrorHandler : IErrorHandler
{
    public ErrorDisposition Handle(Exception ex, string fallbackMessage) => ErrorDisposition.Continue;
}

/// <summary>
/// Deterministic, cross-platform KEK protector for tests: base64 round-trip with no OS dependency
/// (avoids DPAPI's user binding and the POSIX protector-key file). Not for production use.
/// </summary>
internal sealed class IdentityKekProtector : IKekProtector
{
    public string Protect(byte[] kek) => Convert.ToBase64String(kek);

    public byte[]? Unprotect(string protectedBlob)
    {
        try
        {
            return Convert.FromBase64String(protectedBlob);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    public void Reset() { }
}
