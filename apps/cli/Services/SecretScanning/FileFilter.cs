namespace DepVault.Cli.Services.SecretScanning;

/// <summary>Determines which files should be scanned for secrets and which pattern set to use.</summary>
internal static class FileFilter
{
    private const int MaxFileSizeBytes = 1_048_576; // 1MB

    private static readonly HashSet<string> excludedDirs = new(StringComparer.OrdinalIgnoreCase)
    {
        "node_modules", ".git", "bin", "obj", "target", "vendor",
        "__pycache__", "dist", "build", ".next", ".nuget", "packages",
        ".vs", ".idea", "coverage", "generated"
    };

    private static readonly HashSet<string> excludedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
        ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf", ".eot",
        ".pdf", ".mp3", ".mp4", ".mov", ".lock", ".snap"
    };

    private static readonly string[] testFileSuffixes =
    [
        ".test.ts", ".test.tsx", ".test.js", ".test.jsx",
        ".spec.ts", ".spec.tsx", ".spec.js", ".spec.jsx",
        ".test.cs", ".spec.cs",
        "_test.go", "_test.py", "test_.py",
        ".test.rs", ".spec.rb"
    ];

    private static readonly HashSet<string> sourceCodeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt",
        ".rb", ".php", ".swift", ".c", ".cpp", ".h", ".hpp", ".scala",
        ".md", ".mdx", ".rst", ".txt", ".adoc"
    };

    public static bool ShouldSkip(string filePath, string rootPath)
    {
        var ext = Path.GetExtension(filePath);
        if (excludedExtensions.Contains(ext))
        {
            return true;
        }

        var fileName = Path.GetFileName(filePath);
        foreach (var suffix in testFileSuffixes)
        {
            if (fileName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        try
        {
            if (new FileInfo(filePath).Length > MaxFileSizeBytes)
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
            if (excludedDirs.Contains(segment)
                || string.Equals(segment, "__tests__", StringComparison.OrdinalIgnoreCase)
                || string.Equals(segment, "fixtures", StringComparison.OrdinalIgnoreCase)
                || string.Equals(segment, "testdata", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    public static bool IsSourceCode(string filePath)
    {
        return sourceCodeExtensions.Contains(Path.GetExtension(filePath));
    }
}
