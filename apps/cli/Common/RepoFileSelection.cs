using AppEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files_kind;

namespace DepVault.Cli.Common;

/// <summary>
/// Pure repo-map selection and path resolution shared by <c>pull</c> and <c>purge</c> so both compute
/// the same file set and on-disk paths. No IO or rendering — callers own their error messages.
/// </summary>
public static class RepoFileSelection
{
    public const string BaseSlug = "base";

    /// <summary>Lower-cases and trims an environment filter, returning null for blank input.</summary>
    public static string? NormalizeEnv(string? environment)
    {
        return string.IsNullOrWhiteSpace(environment) ? null : environment.Trim().ToLowerInvariant();
    }

    /// <summary>Matches apps by name or repo-relative path (case-insensitive); all apps when no filter.</summary>
    public static List<AppEntry> FilterApps(IReadOnlyList<AppEntry> apps, string? appFilter)
    {
        if (string.IsNullOrEmpty(appFilter))
        {
            return apps.ToList();
        }

        return apps.Where(a =>
            string.Equals(a.Name, appFilter, StringComparison.OrdinalIgnoreCase)
            || string.Equals(a.AppPath, appFilter, StringComparison.OrdinalIgnoreCase)).ToList();
    }

    /// <summary>Flattens the apps' files, applying the secret and environment filters.</summary>
    public static List<FileEntry> CollectFiles(
        IEnumerable<AppEntry> apps, string? envFilter, bool includeBase, bool includeSecrets)
    {
        return apps
            .SelectMany(a => a.Files ?? [])
            .Where(f => includeSecrets || f.Kind != RepoFileKind.SECRET)
            .Where(f => MatchesEnvironment(f.EnvironmentSlug, envFilter, includeBase))
            .ToList();
    }

    /// <summary>Slug passes the filter when it matches, or it is <c>base</c> and <paramref name="includeBase"/>; all pass when no filter.</summary>
    public static bool MatchesEnvironment(string? slug, string? envFilter, bool includeBase)
    {
        if (envFilter is null)
        {
            return true;
        }

        var normalized = (slug ?? BaseSlug).ToLowerInvariant();

        if (string.Equals(normalized, envFilter, StringComparison.Ordinal))
        {
            return true;
        }

        return includeBase && string.Equals(normalized, BaseSlug, StringComparison.Ordinal);
    }

    /// <summary>
    /// Absolute path under <paramref name="outputDir"/> (normalizes separators, strips leading slashes);
    /// creates no directories. Throws <see cref="InvalidOperationException"/> when a server-supplied
    /// <paramref name="relativePath"/> (e.g. one containing <c>..</c> or a rooted path) would escape
    /// <paramref name="outputDir"/> — callers must never write to or delete such a path.
    /// </summary>
    public static string ResolveTargetPath(string outputDir, string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        var baseDir = Path.GetFullPath(outputDir);
        var resolved = Path.GetFullPath(Path.Combine(baseDir, normalized));

        var comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;
        var basePrefix = baseDir.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!resolved.StartsWith(basePrefix, comparison))
        {
            throw new InvalidOperationException(
                $"Refusing to resolve '{relativePath}' outside the target directory '{outputDir}'.");
        }

        return resolved;
    }
}
