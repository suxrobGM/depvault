using DepVault.Cli.Services;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;

namespace DepVault.Cli.Tests.Services;

/// <summary>Tests purge deletion: counts, empty-dir pruning (never the floor), and dry-run.</summary>
public sealed class RepoFilePurgerTests : IDisposable
{
    private readonly string _root;
    private readonly RepoFilePurger _purger = new(new NoOpOutput(), new ContinueErrorHandler());

    public RepoFilePurgerTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "depvault-purge-" + Guid.NewGuid().ToString("N"));
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
            // Best-effort temp cleanup.
        }
    }

    private static FileEntry Entry(string relativePath) => new() { RelativePath = relativePath, Id = relativePath };

    private void Create(string relativePath)
    {
        var full = Path.Combine(_root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        File.WriteAllText(full, "x");
    }

    private bool Exists(string relativePath) =>
        File.Exists(Path.Combine(_root, relativePath.Replace('/', Path.DirectorySeparatorChar)));

    [Fact]
    public void Purge_DeletesExisting_AndCountsMissing()
    {
        Create(".env");
        Create("apps/web/.env.prod");
        var entries = new[] { Entry(".env"), Entry("apps/web/.env.prod"), Entry("never-pulled.env") };

        var result = _purger.Purge(entries, _root, dryRun: false, pruneEmptyDirs: false, CancellationToken.None);

        Assert.Equal(2, result.AffectedFiles);
        Assert.Equal(1, result.NotFound);
        Assert.False(Exists(".env"));
        Assert.False(Exists("apps/web/.env.prod"));
    }

    [Fact]
    public void Purge_DryRun_DeletesNothing_ButCounts()
    {
        Create(".env");
        var entries = new[] { Entry(".env") };

        var result = _purger.Purge(entries, _root, dryRun: true, pruneEmptyDirs: true, CancellationToken.None);

        Assert.Equal(1, result.AffectedFiles);
        Assert.True(Exists(".env"));
        Assert.Equal(0, result.DirsRemoved);
    }

    [Fact]
    public void Purge_PrunesEmptiedDirs_ButNeverFloor()
    {
        Create("apps/web/.env");
        var entries = new[] { Entry("apps/web/.env") };

        var result = _purger.Purge(entries, _root, dryRun: false, pruneEmptyDirs: true, CancellationToken.None);

        Assert.Equal(1, result.AffectedFiles);
        Assert.False(Directory.Exists(Path.Combine(_root, "apps", "web")));
        Assert.False(Directory.Exists(Path.Combine(_root, "apps")));
        Assert.True(Directory.Exists(_root)); // floor is never removed
        Assert.Equal(2, result.DirsRemoved);
    }

    [Fact]
    public void Purge_DoesNotPrune_DirWithSiblingFiles()
    {
        Create("apps/web/.env");
        Create("apps/web/keep.txt");
        var entries = new[] { Entry("apps/web/.env") };

        var result = _purger.Purge(entries, _root, dryRun: false, pruneEmptyDirs: true, CancellationToken.None);

        Assert.Equal(1, result.AffectedFiles);
        Assert.Equal(0, result.DirsRemoved);
        Assert.True(Directory.Exists(Path.Combine(_root, "apps", "web")));
        Assert.True(Exists("apps/web/keep.txt"));
    }

    [Fact]
    public void Purge_NoPrune_LeavesEmptyDirs()
    {
        Create("apps/web/.env");
        var entries = new[] { Entry("apps/web/.env") };

        var result = _purger.Purge(entries, _root, dryRun: false, pruneEmptyDirs: false, CancellationToken.None);

        Assert.Equal(0, result.DirsRemoved);
        Assert.True(Directory.Exists(Path.Combine(_root, "apps", "web")));
    }
}
