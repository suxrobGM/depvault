using System.Text.RegularExpressions;

namespace DepVault.Cli.Utils;

/// <summary>AOT-safe source-generated regex patterns used across the CLI.</summary>
public static partial class RegexPatterns
{
    [GeneratedRegex(@"\[remote\s+""origin""\]\s*\n\s*url\s*=\s*(.+)", RegexOptions.IgnoreCase)]
    public static partial Regex GitRemoteOriginUrl();

    [GeneratedRegex(@"[^:]+:(?:.+/)?([^/]+)$")]
    public static partial Regex GitSshUrl();
}
