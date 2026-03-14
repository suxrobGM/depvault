using System.Text.RegularExpressions;

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

public sealed partial class SecretDetector : ISecretDetector
{
    private const int MaxFileSizeBytes = 1_048_576; // 1MB

    private static readonly HashSet<string> ExcludedDirs = new(StringComparer.OrdinalIgnoreCase)
    {
        "node_modules", ".git", "bin", "obj", "target", "vendor",
        "__pycache__", "dist", "build", ".next", ".nuget", "packages",
        ".vs", ".idea", "coverage", "generated"
    };

    private static readonly HashSet<string> ExcludedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
        ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf", ".eot",
        ".pdf", ".mp3", ".mp4", ".mov", ".lock",
        ".snap" // jest snapshots
    };

    private static readonly string[] TestFileSuffixes =
    [
        ".test.ts", ".test.tsx", ".test.js", ".test.jsx",
        ".spec.ts", ".spec.tsx", ".spec.js", ".spec.jsx",
        ".test.cs", ".spec.cs",
        "_test.go", "_test.py", "test_.py",
        ".test.rs", ".spec.rb"
    ];

    // Source code and documentation files — only scan for high-entropy patterns (AWS keys, private keys, tokens),
    // not for generic "password=" or "secret=" which produce false positives on variable declarations.
    private static readonly HashSet<string> SourceCodeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt",
        ".rb", ".php", ".swift", ".c", ".cpp", ".h", ".hpp", ".scala",
        ".md", ".mdx", ".rst", ".txt", ".adoc"
    };

    // Only high-confidence patterns are used for source code files
    private static readonly PatternDefinition[] HighConfidencePatterns =
    [
        new("AWS Access Key", SecretSeverity.Critical, AwsAccessKeyRegex()),
        new("Private Key", SecretSeverity.Critical, PrivateKeyRegex()),
        new("GitHub Token", SecretSeverity.Critical, GitHubTokenRegex()),
        new("Slack Token", SecretSeverity.High, SlackTokenRegex()),
        new("JWT Token", SecretSeverity.Medium, JwtTokenRegex()),
    ];

    // All patterns are used for config files (.env, .yml, .json, Dockerfile, etc.)
    private static readonly PatternDefinition[] AllPatterns =
    [
        new("AWS Access Key", SecretSeverity.Critical, AwsAccessKeyRegex()),
        new("Private Key", SecretSeverity.Critical, PrivateKeyRegex()),
        new("GitHub Token", SecretSeverity.Critical, GitHubTokenRegex()),
        new("AWS Secret Key", SecretSeverity.Critical, AwsSecretKeyRegex()),
        new("Generic API Key", SecretSeverity.High, GenericApiKeyRegex()),
        new("Generic Secret/Password", SecretSeverity.High, GenericSecretRegex()),
        new("Connection String", SecretSeverity.High, ConnectionStringRegex()),
        new("Slack Token", SecretSeverity.High, SlackTokenRegex()),
        new("Database URI", SecretSeverity.Medium, DatabaseUriRegex()),
        new("JWT Token", SecretSeverity.Medium, JwtTokenRegex()),
    ];

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
                if (ShouldSkipFile(filePath, fullRoot))
                {
                    continue;
                }

                var relativePath = Path.GetRelativePath(fullRoot, filePath).Replace('\\', '/');

                if (gitignore.IsIgnored(relativePath))
                {
                    continue;
                }

                var ext = Path.GetExtension(filePath);
                var patternsToUse = SourceCodeExtensions.Contains(ext) ? HighConfidencePatterns : AllPatterns;
                ScanFile(filePath, relativePath, patternsToUse, detections);
            }
        }
        catch (UnauthorizedAccessException) { }
        catch (DirectoryNotFoundException) { }

        return detections;
    }

    private static void ScanFile(string filePath, string relativePath, PatternDefinition[] patternsToUse,
        List<SecretDetection> detections)
    {
        try
        {
            using var reader = new StreamReader(filePath);
            var lineNumber = 0;
            while (reader.ReadLine() is { } line)
            {
                lineNumber++;

                if (IsPlaceholderLine(line))
                {
                    continue;
                }

                foreach (var pattern in patternsToUse)
                {
                    if (pattern.Regex.IsMatch(line))
                    {
                        var snippet = MaskSnippet(line.Trim(), 80);
                        detections.Add(new SecretDetection(relativePath, lineNumber, pattern.Name, pattern.Severity,
                            snippet));
                        break;
                    }
                }
            }
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    /// <summary>Skips lines with placeholder/template values that aren't real secrets.</summary>
    private static bool IsPlaceholderLine(string line)
    {
        var trimmed = line.Trim();

        // Skip empty lines and comments
        if (trimmed.Length == 0 || trimmed[0] == '#')
        {
            return true;
        }

        // Skip lines with placeholder markers
        if (trimmed.Contains("<PLACEHOLDER>", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("<YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("your_", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("xxx", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("changeme", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("replace_me", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Skip shell variable references: ${VAR_NAME}
        if (PlaceholderVarRefRegex().IsMatch(trimmed))
        {
            return true;
        }

        // Skip lines where value is empty or only quotes after = or :
        if (EmptyValueRegex().IsMatch(trimmed))
        {
            return true;
        }

        return false;
    }

    private static bool ShouldSkipFile(string filePath, string rootPath)
    {
        var ext = Path.GetExtension(filePath);
        if (ExcludedExtensions.Contains(ext))
        {
            return true;
        }

        // Test files use fake secrets by design — skip entirely
        var fileName = Path.GetFileName(filePath);
        foreach (var suffix in TestFileSuffixes)
        {
            if (fileName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        try
        {
            var info = new FileInfo(filePath);
            if (info.Length > MaxFileSizeBytes)
            {
                return true;
            }
        }
        catch
        {
            return true;
        }

        var relativePath = Path.GetRelativePath(rootPath, filePath);
        var parts = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        for (var i = 0; i < parts.Length - 1; i++)
        {
            var segment = parts[i];
            if (ExcludedDirs.Contains(segment)
                || string.Equals(segment, "__tests__", StringComparison.OrdinalIgnoreCase)
                || string.Equals(segment, "fixtures", StringComparison.OrdinalIgnoreCase)
                || string.Equals(segment, "testdata", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string MaskSnippet(string line, int maxLength)
    {
        if (line.Length <= maxLength)
        {
            return line;
        }

        return string.Concat(line.AsSpan(0, maxLength - 3), "...");
    }

    // --- High-confidence patterns (used everywhere) ---

    [GeneratedRegex(@"AKIA[0-9A-Z]{16}", RegexOptions.Compiled)]
    private static partial Regex AwsAccessKeyRegex();

    [GeneratedRegex(@"-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PGP)\s+PRIVATE\s+KEY-----", RegexOptions.Compiled)]
    private static partial Regex PrivateKeyRegex();

    [GeneratedRegex(@"gh[ps]_[A-Za-z0-9_]{36,}", RegexOptions.Compiled)]
    private static partial Regex GitHubTokenRegex();

    [GeneratedRegex(@"xox[bpors]-[A-Za-z0-9\-]+", RegexOptions.Compiled)]
    private static partial Regex SlackTokenRegex();

    [GeneratedRegex(@"eyJ[A-Za-z0-9\-_]{10,}\.eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}", RegexOptions.Compiled)]
    private static partial Regex JwtTokenRegex();

    // --- Lower-confidence patterns (config files only) ---

    [GeneratedRegex(@"aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{20,}", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex AwsSecretKeyRegex();

    [GeneratedRegex(@"(?:api[_\-]?key|apikey)\s*[=:]\s*['""]?[A-Za-z0-9\-_]{16,}", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex GenericApiKeyRegex();

    [GeneratedRegex(@"(?:secret|password|passwd|pwd)\s*=\s*['""]?[^\s'""\$\{<][^\s'""]{7,}", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex GenericSecretRegex();

    [GeneratedRegex(@"(?:Server|Data Source)=.*(?:Password|Pwd)=[^\s;]{4,}", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex ConnectionStringRegex();

    [GeneratedRegex(@"(?:mongodb|postgresql|mysql|redis|amqp):\/\/[^@\s:]+:[^@\s]+@(?!localhost)[^\s]+", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex DatabaseUriRegex();

    // --- Placeholder detection helpers ---

    [GeneratedRegex(@"=\s*\$\{[A-Z_]+\}", RegexOptions.Compiled)]
    private static partial Regex PlaceholderVarRefRegex();

    [GeneratedRegex(@"=\s*['""]?\s*['""]?\s*$", RegexOptions.Compiled)]
    private static partial Regex EmptyValueRegex();

    private record PatternDefinition(string Name, SecretSeverity Severity, Regex Regex);
}
