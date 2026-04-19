using DepVault.Cli.Utils;

namespace DepVault.Cli.Services.SecretScanning;

/// <summary>Determines which files should be scanned for secrets and which pattern set to use.</summary>
internal static class FileFilter
{
    private const int MaxFileSizeBytes = 1_048_576; // 1MB

    private static readonly IReadOnlySet<string> ExcludedDirs = ExcludedDirectories.Names;

    private static readonly HashSet<string> ExtraExcludedDirs = new(StringComparer.OrdinalIgnoreCase)
    {
        "fixtures", "testdata", "tests", "docs", "__tests__"
    };

    private static readonly HashSet<string> ExcludedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
        ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf", ".eot",
        ".pdf", ".mp3", ".mp4", ".mov", ".lock", ".snap"
    };

    private static readonly string[] TestFileSuffixes =
    [
        ".test.ts", ".test.tsx", ".test.js", ".test.jsx",
        ".spec.ts", ".spec.tsx", ".spec.js", ".spec.jsx",
        ".test.cs", ".spec.cs",
        "_test.go", "_test.py", "test_.py",
        ".test.rs", ".spec.rb"
    ];

    private static readonly string[] TemplateFileSuffixes =
    [
        ".example", ".sample", ".template", ".dist", ".tmpl"
    ];

    private static readonly HashSet<string> SourceCodeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt",
        ".rb", ".php", ".swift", ".c", ".cpp", ".h", ".hpp", ".scala",
        ".md", ".mdx", ".rst", ".txt", ".adoc"
    };

    public static bool ShouldSkip(string filePath, string rootPath)
    {
        var ext = Path.GetExtension(filePath);
        if (ExcludedExtensions.Contains(ext))
        {
            return true;
        }

        var fileName = Path.GetFileName(filePath);
        foreach (var suffix in TestFileSuffixes)
        {
            if (fileName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        foreach (var suffix in TemplateFileSuffixes)
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
            if (ExcludedDirs.Contains(segment) || ExtraExcludedDirs.Contains(segment))
            {
                return true;
            }
        }

        return false;
    }

    public static bool IsSourceCode(string filePath)
    {
        return SourceCodeExtensions.Contains(Path.GetExtension(filePath));
    }
}
