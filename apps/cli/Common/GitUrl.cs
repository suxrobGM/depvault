namespace DepVault.Cli.Common;

/// <summary>Normalizes git remote URLs to a canonical form so SSH and HTTPS remotes compare equal.</summary>
public static class GitUrl
{
    /// <summary>
    /// Normalizes a git remote URL to canonical <c>host/owner/repo</c> (lowercased, <c>.git</c>
    /// stripped, userinfo and trailing slash removed), so <c>git@github.com:o/r.git</c> and
    /// <c>https://github.com/o/r</c> match. Returns null when the URL cannot be parsed.
    /// </summary>
    public static string? Normalize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        url = url.Trim();

        // Scheme form (https://, ssh://, git://) — Uri excludes userinfo from Host. The "://" check
        // keeps scp-like syntax (git@host:owner/repo) out of the lenient Uri parser, which would
        // otherwise mis-read the colon as a scheme/port separator.
        if (url.Contains("://"))
        {
            return Uri.TryCreate(url, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.Host)
                ? Canonical(uri.Host, uri.AbsolutePath)
                : null;
        }

        // scp-like: git@github.com:owner/repo.git
        var scp = RegexPatterns.GitScpLikeUrl().Match(url);
        return scp.Success ? Canonical(scp.Groups[1].Value, scp.Groups[2].Value) : null;
    }

    private static string? Canonical(string host, string path)
    {
        // host/path come from the Uri parser or the anchored regex, so they carry no surrounding
        // whitespace — only the leading slash on a Uri AbsolutePath needs stripping.
        host = host.ToLowerInvariant();
        path = path.Trim('/');

        if (path.EndsWith(".git", StringComparison.OrdinalIgnoreCase))
        {
            path = path[..^4];
        }

        path = path.ToLowerInvariant();
        return string.IsNullOrEmpty(host) || string.IsNullOrEmpty(path) ? null : $"{host}/{path}";
    }
}
