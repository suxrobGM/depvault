namespace DepVault.Cli.Utils;

/// <summary>Shared set of directory names to skip during file scanning.</summary>
internal static class ExcludedDirectories
{
    public static readonly IReadOnlySet<string> Names = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        // VCS
        ".git", ".hg", ".svn",

        // Node.js
        "node_modules", ".yarn", ".pnpm-store", "bower_components",

        // Python
        "__pycache__", ".venv", "venv", ".tox", ".mypy_cache",
        ".pytest_cache", ".ruff_cache", "__pypackages__", ".eggs",

        // .NET
        "bin", "obj", ".nuget", "packages", "TestResults", "publish", "artifacts",

        // Rust
        "target",

        // Go / PHP
        "vendor",

        // Java / Kotlin
        ".gradle", ".mvn",

        // Ruby
        ".bundle",

        // Build output
        "dist", "build", "out", ".output",

        // Framework caches
        ".next", ".angular", ".turbo", ".nx", ".parcel-cache",
        ".cache", ".vite", ".svelte-kit",

        // IDE / editor
        ".vs", ".idea", ".vscode",

        // Misc
        "coverage", "generated", "logs", "temp", "tmp"
    };

    /// <summary>
    /// Directories that hold fixtures/sample data rather than real config or secrets. Excluded on
    /// top of <see cref="Names"/> when scanning for secret files and secret leaks.
    /// </summary>
    public static readonly IReadOnlySet<string> FixtureDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "fixtures", "testdata", "tests", "__tests__", "docs"
    };
}
