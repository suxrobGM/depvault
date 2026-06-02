using DepVault.Cli.Services;

namespace DepVault.Cli.Tests.Services;

/// <summary>
/// Tests the marker-walk that maps a discovered file to its owning App. Covers the edge cases:
/// repo-root files and files in unmarked folders group under the synthetic "Repository root" App
/// (never minting a pseudo-app for a non-project folder), marked folders become their own App, and
/// the nearest marker wins so nested apps stay distinct.
/// </summary>
public sealed class AppRootResolverTests : IDisposable
{
    private readonly string _root;

    public AppRootResolverTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "depvault-aprt-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_root))
            {
                Directory.Delete(_root, recursive: true);
            }
        }
        catch
        {
            // Best-effort temp cleanup; ignore races on Windows file locks.
        }
    }

    /// <summary>Drops a project marker (package.json) into a repo-relative directory.</summary>
    private void Marker(string relativeDir)
    {
        var dir = Path.Combine(_root, relativeDir);
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, "package.json"), "{}");
    }

    [Fact]
    public void RootFile_NoMarkers_GroupsUnderRepositoryRoot()
    {
        var (appPath, appName) = AppRootResolver.Resolve(_root, ".env");
        Assert.Equal("", appPath);
        Assert.Equal("Repository root", appName);
    }

    [Fact]
    public void RootFile_WithRootMarker_IsStillRepositoryRoot()
    {
        Marker(""); // package.json at the repo root
        var (appPath, appName) = AppRootResolver.Resolve(_root, ".env");
        Assert.Equal("", appPath);
        Assert.Equal("Repository root", appName);
    }

    [Fact]
    public void UnmarkedSubfolder_GroupsUnderRepositoryRoot()
    {
        Directory.CreateDirectory(Path.Combine(_root, "config"));
        var (appPath, appName) = AppRootResolver.Resolve(_root, "config/database.yml");
        Assert.Equal("", appPath);
        Assert.Equal("Repository root", appName);
    }

    [Fact]
    public void MarkedSubfolder_BecomesItsOwnApp()
    {
        Marker("apps/web");
        var (appPath, appName) = AppRootResolver.Resolve(_root, "apps/web/.env");
        Assert.Equal("apps/web", appPath);
        Assert.Equal("web", appName);
    }

    [Fact]
    public void NestedMarkedApps_StayDistinct()
    {
        Marker("apps/web");
        Marker("apps/api");
        var web = AppRootResolver.Resolve(_root, "apps/web/.env.prod");
        var api = AppRootResolver.Resolve(_root, "apps/api/appsettings.json");
        Assert.Equal("apps/web", web.appPath);
        Assert.Equal("apps/api", api.appPath);
    }

    [Fact]
    public void NearestMarkerWins_OverRootMarker()
    {
        Marker(""); // root marker
        Marker("apps/web"); // nearer marker
        var (appPath, _) = AppRootResolver.Resolve(_root, "apps/web/src/.env");
        Assert.Equal("apps/web", appPath);
    }
}
