namespace DepVault.Cli.Utils;

public static class GitUtils
{
    private static string? CachedRepoRoot;

    /// <summary>
    /// Walks up from the current directory to find the repository root (directory containing .git).
    /// Falls back to the current directory if no .git folder is found. Result is cached.
    /// </summary>
    public static string FindRepoRoot()
    {
        if (CachedRepoRoot is not null)
        {
            return CachedRepoRoot;
        }

        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
            {
                CachedRepoRoot = dir.FullName;
                return CachedRepoRoot;
            }

            dir = dir.Parent;
        }

        CachedRepoRoot = Directory.GetCurrentDirectory();
        return CachedRepoRoot;
    }

    /// <summary>
    /// Reads the remote origin URL from .git/config and extracts the repository name.
    /// Returns null if .git/config doesn't exist or has no remote origin.
    /// </summary>
    public static string? GetRepoName()
    {
        var gitConfig = Path.Combine(FindRepoRoot(), ".git", "config");
        if (!File.Exists(gitConfig))
        {
            return null;
        }

        try
        {
            var content = File.ReadAllText(gitConfig);
            var match = RegexPatterns.GitRemoteOriginUrl().Match(content);

            if (!match.Success)
            {
                return null;
            }

            var url = match.Groups[1].Value.Trim();
            return ExtractRepoName(url);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>Extracts the repo name from a git remote URL (HTTPS or SSH).</summary>
    private static string? ExtractRepoName(string url)
    {
        // Remove trailing .git
        if (url.EndsWith(".git", StringComparison.OrdinalIgnoreCase))
        {
            url = url[..^4];
        }

        // SSH: git@github.com:owner/repo
        var sshMatch = RegexPatterns.GitSshUrl().Match(url);
        if (sshMatch.Success)
        {
            return sshMatch.Groups[1].Value;
        }

        // HTTPS: https://github.com/owner/repo
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            var segments = uri.AbsolutePath.Trim('/').Split('/');
            return segments.Length >= 2 ? segments[^1] : null;
        }

        return null;
    }
}
