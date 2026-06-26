using DepVault.Cli.Common;
using DepVault.Cli.Output;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;

namespace DepVault.Cli.Services;

/// <summary>
/// Deletes the on-disk files a <c>pull</c> would have written, using the same path logic. No decryption
/// or network — it removes files by path, so the project DEK is never needed.
/// </summary>
public sealed class RepoFilePurger(IOutputFormatter output, IErrorHandler errorHandler)
{
    private static readonly StringComparison PathComparison =
        OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    public readonly record struct PurgeResult(int AffectedFiles, int NotFound, int DirsRemoved);

    private readonly record struct PurgeTarget(string RelativePath, string FullPath, string Directory);

    private sealed record PurgePlan(List<PurgeTarget> Targets, int NotFound, bool Aborted);

    /// <summary>
    /// Deletes each entry under <paramref name="outputDir"/> (counts only, when <paramref name="dryRun"/>).
    /// With <paramref name="pruneEmptyDirs"/>, removes dirs emptied by this run, never passing <paramref name="outputDir"/>.
    /// </summary>
    public PurgeResult Purge(
        IReadOnlyList<FileEntry> entries,
        string outputDir,
        bool dryRun,
        bool pruneEmptyDirs,
        CancellationToken ct)
    {
        var affectedFiles = 0;
        var deletedDirs = new HashSet<string>(StringComparer.Ordinal);
        var plan = BuildPlan(entries, outputDir, ct);

        foreach (var target in plan.Targets)
        {
            ct.ThrowIfCancellationRequested();

            try
            {
                if (!dryRun)
                {
                    File.Delete(target.FullPath);
                }

                deletedDirs.Add(target.Directory);
                output.PrintSuccess($"  {(dryRun ? "would delete " : "")}{target.RelativePath}");
                affectedFiles++;
            }
            catch (Exception ex)
            {
                if (errorHandler.Handle(ex, $"Failed to delete {target.RelativePath}") == ErrorDisposition.Abort)
                {
                    break;
                }
            }
        }

        var dirsRemoved = !plan.Aborted && pruneEmptyDirs && !dryRun
            ? PruneEmptyDirs(deletedDirs, outputDir)
            : 0;

        return new PurgeResult(affectedFiles, plan.NotFound, dirsRemoved);
    }

    private PurgePlan BuildPlan(IReadOnlyList<FileEntry> entries, string outputDir, CancellationToken ct)
    {
        var targets = new List<PurgeTarget>();
        var notFound = 0;

        foreach (var entry in entries)
        {
            ct.ThrowIfCancellationRequested();

            if (string.IsNullOrEmpty(entry.RelativePath))
            {
                continue;
            }

            try
            {
                // Resolve first so a server-supplied path that escapes outputDir is handled like any
                // other per-file failure, before the deletion loop starts.
                var filePath = RepoFileSelection.ResolveTargetPath(outputDir, entry.RelativePath);
                if (!File.Exists(filePath))
                {
                    notFound++;
                    continue;
                }

                var dir = Path.GetDirectoryName(filePath);
                if (string.IsNullOrEmpty(dir))
                {
                    continue;
                }

                targets.Add(new PurgeTarget(Path.GetRelativePath(outputDir, filePath), filePath, dir));
            }
            catch (Exception ex)
            {
                if (errorHandler.Handle(ex, $"Failed to delete {entry.RelativePath}") == ErrorDisposition.Abort)
                {
                    return new PurgePlan(targets, notFound, Aborted: true);
                }
            }
        }

        return new PurgePlan(targets, notFound, Aborted: false);
    }

    /// <summary>Removes now-empty dirs, walking up toward but never reaching <paramref name="floorDir"/>.</summary>
    private static int PruneEmptyDirs(IEnumerable<string> startDirs, string floorDir)
    {
        // The prefix check below is true only for strict descendants of the floor, so the floor itself
        // (and anything above it) is never removed.
        var floorPrefix = Path.GetFullPath(floorDir).TrimEnd(Path.DirectorySeparatorChar)
            + Path.DirectorySeparatorChar;
        var removed = 0;

        foreach (var startDir in startDirs)
        {
            var dir = Path.GetFullPath(startDir);

            while (dir.StartsWith(floorPrefix, PathComparison) && Directory.Exists(dir))
            {
                if (Directory.EnumerateFileSystemEntries(dir).Any())
                {
                    break;
                }

                try
                {
                    Directory.Delete(dir);
                    removed++;
                }
                catch
                {
                    break;
                }

                var parent = Path.GetDirectoryName(dir);
                if (string.IsNullOrEmpty(parent))
                {
                    break;
                }

                dir = parent;
            }
        }

        return removed;
    }
}
