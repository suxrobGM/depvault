using System.Diagnostics;
using DepVault.Cli.Common;

namespace DepVault.Cli.Services;

/// <summary>Locates the git repository root, name, and remote URL for the current working tree.</summary>
public interface IRepositoryLocator
{
    /// <summary>
    /// Walks up from the current directory to the repository root (the directory containing
    /// <c>.git</c>), falling back to the current directory. Cached for the process lifetime.
    /// </summary>
    string FindRepoRoot();

    /// <summary>Extracts the repo name from the remote origin URL in <c>.git/config</c>, or null.</summary>
    string? GetRepoName();

    /// <summary>Reads <c>git remote get-url origin</c> via subprocess (3s timeout), or null.</summary>
    Task<string?> GetRemoteUrlAsync(string repoPath, CancellationToken ct);
}

public sealed class RepositoryLocator : IRepositoryLocator
{
    private string? cachedRepoRoot;

    public string FindRepoRoot()
    {
        if (cachedRepoRoot is not null)
        {
            return cachedRepoRoot;
        }

        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
            {
                cachedRepoRoot = dir.FullName;
                return cachedRepoRoot;
            }

            dir = dir.Parent;
        }

        cachedRepoRoot = Directory.GetCurrentDirectory();
        return cachedRepoRoot;
    }

    public string? GetRepoName()
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

            return ExtractRepoName(match.Groups[1].Value.Trim());
        }
        catch
        {
            return null;
        }
    }

    public async Task<string?> GetRemoteUrlAsync(string repoPath, CancellationToken ct)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(3));

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "git",
                    ArgumentList = { "remote", "get-url", "origin" },
                    WorkingDirectory = repoPath,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var url = (await process.StandardOutput.ReadToEndAsync(cts.Token)).Trim();
            await process.WaitForExitAsync(cts.Token);

            return process.ExitCode == 0 && !string.IsNullOrEmpty(url) ? url : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>Extracts the repo name from a git remote URL (HTTPS or SSH).</summary>
    private static string? ExtractRepoName(string url)
    {
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
