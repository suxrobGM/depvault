using System.Diagnostics;
using DepVault.Cli.Services.SecretScanning;

namespace DepVault.Cli.Services;

public enum SecretSeverity
{
    Critical,
    High,
    Medium,
    Low
}

public record SecretDetection(
    string FilePath,
    int LineNumber,
    string PatternName,
    SecretSeverity Severity,
    string MatchedSnippet);

public interface ISecretDetector
{
    List<SecretDetection> ScanDirectory(string rootPath);
}

public sealed class SecretDetector : ISecretDetector
{
    public List<SecretDetection> ScanDirectory(string rootPath)
    {
        var detections = new List<SecretDetection>();
        var fullRoot = Path.GetFullPath(rootPath);

        try
        {
            var allFiles = Directory.EnumerateFiles(fullRoot, "*", new EnumerationOptions
            {
                RecurseSubdirectories = true,
                IgnoreInaccessible = true,
                MaxRecursionDepth = 10
            });

            var candidates = new List<(string FullPath, string RelativePath)>();

            foreach (var filePath in allFiles)
            {
                if (FileFilter.ShouldSkip(filePath, fullRoot))
                {
                    continue;
                }

                var relativePath = Path.GetRelativePath(fullRoot, filePath).Replace('\\', '/');
                candidates.Add((filePath, relativePath));
            }

            var gitIgnored = GetGitIgnoredPaths(fullRoot, candidates.Select(c => c.RelativePath).ToList());

            foreach (var (filePath, relativePath) in candidates)
            {
                if (gitIgnored.Contains(relativePath))
                {
                    continue;
                }

                var patterns = FileFilter.IsSourceCode(filePath)
                    ? SecretPatterns.HighConfidence
                    : SecretPatterns.All;

                ScanFile(filePath, relativePath, patterns, detections);
            }
        }
        catch (UnauthorizedAccessException)
        {
        }
        catch (DirectoryNotFoundException)
        {
        }

        return detections;
    }

    private static HashSet<string> GetGitIgnoredPaths(string rootPath, List<string> relativePaths)
    {
        if (relativePaths.Count == 0)
        {
            return [];
        }

        var ignored = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var psi = new ProcessStartInfo("git", "check-ignore --stdin")
            {
                WorkingDirectory = rootPath,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process is null)
            {
                return FallbackGitignoreFilter(rootPath, relativePaths);
            }

            process.StandardInput.Write(string.Join('\n', relativePaths));
            process.StandardInput.Close();

            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit(5000);

            foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                ignored.Add(line.Trim().Replace('\\', '/'));
            }
        }
        catch
        {
            return FallbackGitignoreFilter(rootPath, relativePaths);
        }

        return ignored;
    }

    private static HashSet<string> FallbackGitignoreFilter(string rootPath, List<string> relativePaths)
    {
        var gitignore = GitignoreFilter.Load(rootPath);
        return new HashSet<string>(
            relativePaths.Where(p => gitignore.IsIgnored(p)),
            StringComparer.OrdinalIgnoreCase);
    }

    private static void ScanFile(
        string filePath, string relativePath, PatternDefinition[] patterns, List<SecretDetection> detections)
    {
        try
        {
            using var reader = new StreamReader(filePath);
            var lineNumber = 0;
            while (reader.ReadLine() is { } line)
            {
                lineNumber++;

                if (PlaceholderFilter.IsPlaceholder(line))
                {
                    continue;
                }

                foreach (var pattern in patterns)
                {
                    if (!pattern.Regex.IsMatch(line))
                    {
                        continue;
                    }

                    var snippet = line.Trim();
                    if (snippet.Length > 80)
                    {
                        snippet = string.Concat(snippet.AsSpan(0, 77), "...");
                    }

                    detections.Add(new SecretDetection(relativePath, lineNumber, pattern.Name, pattern.Severity,
                        snippet));
                    break;
                }
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
