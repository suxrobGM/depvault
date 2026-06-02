namespace DepVault.Cli.Services;

/// <summary>
/// Infers the owning "app" of a file by walking up from the file's directory toward the
/// repository root and selecting the nearest ancestor that contains a project marker
/// (a known ecosystem dependency file, a *.sln, or a *.csproj).
/// </summary>
internal static class AppRootResolver
{
    /// <summary>
    /// Resolves the app path/name for <paramref name="fileRelativePath"/> within <paramref name="repoRoot"/>.
    /// </summary>
    /// <param name="repoRoot">Absolute path to the repository root.</param>
    /// <param name="fileRelativePath">Path of the file relative to <paramref name="repoRoot"/> (any separator).</param>
    /// <returns>
    /// <c>appPath</c>: the marker directory's repo-relative path using '/' separators
    /// ("" for the repo root); <c>appName</c>: the last path segment of that directory
    /// (or "Repository root" when the file groups under the repo root).
    /// </returns>
    public static (string appPath, string appName) Resolve(string repoRoot, string fileRelativePath)
    {
        var fullRoot = Path.GetFullPath(repoRoot);
        var normalizedRelative = fileRelativePath.Replace('\\', '/').TrimStart('/');
        var fullFile = Path.GetFullPath(Path.Combine(fullRoot, normalizedRelative));

        var fileDir = new DirectoryInfo(Path.GetDirectoryName(fullFile) ?? fullRoot);
        var rootDir = new DirectoryInfo(fullRoot);

        var dir = fileDir;
        DirectoryInfo? markerDir = null;

        while (dir is not null)
        {
            if (HasProjectMarker(dir.FullName))
            {
                markerDir = dir;
                break;
            }

            if (PathsEqual(dir.FullName, rootDir.FullName))
            {
                break;
            }

            dir = dir.Parent;
        }

        // No marker found anywhere up to the repo root → group the file under the repo-root App.
        // Falling back to the file's own directory would mint a pseudo-app for unmarked folders
        // (e.g. `config/`, `infra/`); attaching loose files to the root keeps the app list clean
        // and loses nothing, since `relativePath` already preserves the full path.
        var chosen = markerDir ?? rootDir;

        return BuildResult(rootDir.FullName, chosen.FullName);
    }

    private static (string appPath, string appName) BuildResult(string repoRoot, string appDirFullPath)
    {
        var relative = Path.GetRelativePath(repoRoot, appDirFullPath).Replace('\\', '/');

        if (relative is "." or "")
        {
            // The repo root is named deterministically rather than after the local checkout folder,
            // whose name varies per clone and would churn the App's display name across developers.
            return ("", "Repository root");
        }

        relative = relative.Trim('/');
        var lastSlash = relative.LastIndexOf('/');
        var appName = lastSlash >= 0 ? relative[(lastSlash + 1)..] : relative;

        return (relative, appName);
    }

    /// <summary>True if the directory contains a recognised project/solution marker.</summary>
    private static bool HasProjectMarker(string dirFullPath)
    {
        try
        {
            foreach (var marker in EcosystemResolver.Map.Keys)
            {
                if (File.Exists(Path.Combine(dirFullPath, marker)))
                {
                    return true;
                }
            }

            // .NET project/solution files vary by name → glob the directory.
            if (Directory.EnumerateFiles(dirFullPath, "*.csproj").Any()
                || Directory.EnumerateFiles(dirFullPath, "*.sln").Any())
            {
                return true;
            }
        }
        catch (UnauthorizedAccessException)
        {
        }
        catch (DirectoryNotFoundException)
        {
        }

        return false;
    }

    private static bool PathsEqual(string a, string b)
    {
        return string.Equals(
            a.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
            b.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
            OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
    }
}
