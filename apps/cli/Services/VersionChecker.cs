using System.Text.Json;
using System.Text.Json.Serialization;
using Spectre.Console;
using DepVault.Cli.Output;

namespace DepVault.Cli.Services;

/// <summary>Checks whether a newer CLI version is available, with a 24-hour cache.</summary>
public interface IVersionChecker
{
    /// <summary>Returns the latest version string (e.g. "1.2.0") or null on failure.</summary>
    Task<string?> GetLatestVersionAsync(CancellationToken ct = default);

    /// <summary>Returns the current assembly version string (e.g. "1.1.0").</summary>
    string GetCurrentVersion();

    /// <summary>Prints an update hint if a newer version is available (reads from cache first).</summary>
    Task PrintUpdateHintAsync(CancellationToken ct = default);
}

public sealed class VersionChecker(IGitHubReleaseClient gitHub) : IVersionChecker
{
    private static readonly TimeSpan checkInterval = TimeSpan.FromHours(24);

    public string GetCurrentVersion()
    {
        return typeof(Program).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
    }

    public async Task<string?> GetLatestVersionAsync(CancellationToken ct = default)
    {
        var version = await gitHub.GetLatestCliVersionAsync(ct);

        if (version is not null)
        {
            SaveCache(version);
        }

        return version;
    }

    public async Task PrintUpdateHintAsync(CancellationToken ct = default)
    {
        try
        {
            var latestVersion = GetCachedVersion() ?? await GetLatestVersionAsync(ct);

            if (latestVersion is null)
            {
                return;
            }

            var current = GetCurrentVersion();

            if (IsNewer(latestVersion, current))
            {
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine(
                    $"[{ConsoleTheme.Warning.ToMarkup()}]A new version of DepVault CLI is available: " +
                    $"[bold]v{latestVersion}[/] (current: v{current})[/]");
                AnsiConsole.MarkupLine(
                    $"[{ConsoleTheme.Muted.ToMarkup()}]Run [bold]depvault update[/] to update.[/]");
            }
        }
        catch
        {
            // Never break the user's command because of a version check failure
        }
    }

    internal static bool IsNewer(string latest, string current)
    {
        return Version.TryParse(latest, out var latestV)
            && Version.TryParse(current, out var currentV)
            && latestV > currentV;
    }

    private static string? GetCachedVersion()
    {
        try
        {
            if (!File.Exists(Constants.VersionCheckPath))
            {
                return null;
            }

            var json = File.ReadAllText(Constants.VersionCheckPath);
            var cache = JsonSerializer.Deserialize(json, VersionCheckJsonContext.Default.VersionCheckCache);

            if (cache is null || DateTime.UtcNow - cache.CheckedAt > checkInterval)
            {
                return null;
            }

            return cache.LatestVersion;
        }
        catch
        {
            return null;
        }
    }

    private static void SaveCache(string version)
    {
        try
        {
            Directory.CreateDirectory(Constants.ConfigDir);
            var cache = new VersionCheckCache { LatestVersion = version, CheckedAt = DateTime.UtcNow };
            var json = JsonSerializer.Serialize(cache, VersionCheckJsonContext.Default.VersionCheckCache);
            File.WriteAllText(Constants.VersionCheckPath, json);
        }
        catch
        {
            // Best-effort cache write
        }
    }
}

internal sealed class VersionCheckCache
{
    [JsonPropertyName("latestVersion")]
    public string LatestVersion { get; set; } = "";

    [JsonPropertyName("checkedAt")]
    public DateTime CheckedAt { get; set; }
}

[JsonSerializable(typeof(VersionCheckCache))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class VersionCheckJsonContext : JsonSerializerContext;
