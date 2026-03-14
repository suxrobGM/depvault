using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepVault.Cli.Services;

/// <summary>Fetches release information from the GitHub API.</summary>
public interface IGitHubReleaseClient
{
    /// <summary>Returns the latest CLI version string (e.g. "1.2.0") or null on failure.</summary>
    Task<string?> GetLatestCliVersionAsync(CancellationToken ct = default);

    /// <summary>Builds the download URL for a given version and runtime identifier.</summary>
    string BuildDownloadUrl(string version, string rid);
}

public sealed class GitHubReleaseClient : IGitHubReleaseClient
{
    private static readonly HttpClient http = new()
    {
        DefaultRequestHeaders =
        {
            { "User-Agent", "depvault-cli" },
            { "Accept", "application/vnd.github+json" }
        },
        Timeout = TimeSpan.FromSeconds(5)
    };

    public async Task<string?> GetLatestCliVersionAsync(CancellationToken ct = default)
    {
        try
        {
            var url = $"https://api.github.com/repos/{Constants.GitHubRepo}/releases?per_page=20";
            var releases = await http.GetFromJsonAsync(url, GitHubJsonContext.Default.GitHubReleaseArray, ct);

            if (releases is null)
            {
                return null;
            }

            foreach (var release in releases)
            {
                if (release.TagName?.StartsWith(Constants.GitHubReleaseTagPrefix, StringComparison.Ordinal) == true)
                {
                    return release.TagName[Constants.GitHubReleaseTagPrefix.Length..];
                }
            }
        }
        catch
        {
            // Network errors, rate limits, etc. — fail silently
        }

        return null;
    }

    public string BuildDownloadUrl(string version, string rid)
    {
        var isWindows = rid.StartsWith("win", StringComparison.Ordinal);
        var ext = isWindows ? "zip" : "tar.gz";
        var tag = $"{Constants.GitHubReleaseTagPrefix}{version}";
        return $"https://github.com/{Constants.GitHubRepo}/releases/download/{tag}/depvault-{rid}.{ext}";
    }
}

internal sealed class GitHubRelease
{
    [JsonPropertyName("tag_name")]
    public string? TagName { get; set; }
}

[JsonSerializable(typeof(GitHubRelease[]))]
internal partial class GitHubJsonContext : JsonSerializerContext;
