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
        var gitignore = GitignoreFilter.Load(fullRoot);

        try
        {
            var files = Directory.EnumerateFiles(fullRoot, "*", new EnumerationOptions
            {
                RecurseSubdirectories = true,
                IgnoreInaccessible = true,
                MaxRecursionDepth = 10
            });

            foreach (var filePath in files)
            {
                if (FileFilter.ShouldSkip(filePath, fullRoot))
                {
                    continue;
                }

                var relativePath = Path.GetRelativePath(fullRoot, filePath).Replace('\\', '/');

                if (gitignore.IsIgnored(relativePath))
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
