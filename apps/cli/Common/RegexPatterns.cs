using System.Text.RegularExpressions;

namespace DepVault.Cli.Common;

/// <summary>AOT-safe source-generated regex patterns used across the CLI.</summary>
public static partial class RegexPatterns
{
    [GeneratedRegex(@"\[remote\s+""origin""\]\s*\n\s*url\s*=\s*(.+)", RegexOptions.IgnoreCase)]
    public static partial Regex GitRemoteOriginUrl();

    [GeneratedRegex(@"[^:]+:(?:.+/)?([^/]+)$")]
    public static partial Regex GitSshUrl();

    /// <summary>
    /// Captures host (group 1) and path (group 2) from scp-like or <c>ssh://</c> git URLs
    /// (e.g. <c>git@github.com:owner/repo.git</c>), for normalizing to <c>host/owner/repo</c>.
    /// </summary>
    [GeneratedRegex(@"^(?:ssh://)?(?:[^@/]+@)?([^:/]+)[:/](.+?)(?:\.git)?/?$")]
    public static partial Regex GitScpLikeUrl();
}
