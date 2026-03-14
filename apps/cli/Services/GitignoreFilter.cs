namespace DepVault.Cli.Services;

/// <summary>
/// Loads .gitignore files (including nested ones) and checks whether a relative path is ignored.
/// Supports: exact names, directory patterns, wildcards (* prefix/suffix), negation (!), and path prefixes.
/// </summary>
public sealed class GitignoreFilter
{
    private readonly List<GitignoreRule> _rules = [];

    private GitignoreFilter() { }

    /// <summary>Loads all .gitignore files under rootPath (root + nested) and builds a filter.</summary>
    public static GitignoreFilter Load(string rootPath)
    {
        var filter = new GitignoreFilter();
        var fullRoot = Path.GetFullPath(rootPath);

        // Collect all .gitignore files
        try
        {
            var gitignoreFiles = Directory.EnumerateFiles(fullRoot, ".gitignore", new EnumerationOptions
            {
                RecurseSubdirectories = true,
                IgnoreInaccessible = true,
                MaxRecursionDepth = 10
            });

            foreach (var gitignorePath in gitignoreFiles)
            {
                var dir = Path.GetDirectoryName(gitignorePath)!;
                var relativeDir = Path.GetRelativePath(fullRoot, dir).Replace('\\', '/');

                // Root .gitignore has scope ""
                var scope = relativeDir == "." ? "" : relativeDir;
                filter.LoadFile(gitignorePath, scope);
            }
        }
        catch (UnauthorizedAccessException) { }
        catch (DirectoryNotFoundException) { }

        return filter;
    }

    /// <summary>Returns true if the relative path (forward-slash separated) should be ignored.</summary>
    public bool IsIgnored(string relativePath)
    {
        var ignored = false;

        foreach (var rule in _rules)
        {
            // Rule only applies if the file is within the rule's scope
            if (rule.Scope.Length > 0 && !relativePath.StartsWith(rule.Scope + "/", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            // Path relative to the .gitignore file's directory
            var pathInScope = rule.Scope.Length > 0
                ? relativePath[(rule.Scope.Length + 1)..]
                : relativePath;

            if (MatchesPattern(pathInScope, rule.Pattern))
            {
                ignored = !rule.IsNegation;
            }
        }

        return ignored;
    }

    private void LoadFile(string filePath, string scope)
    {
        try
        {
            foreach (var rawLine in File.ReadLines(filePath))
            {
                var line = rawLine.Trim();
                if (line.Length == 0 || line[0] == '#')
                {
                    continue;
                }

                var isNegation = false;
                if (line[0] == '!')
                {
                    isNegation = true;
                    line = line[1..].Trim();
                    if (line.Length == 0)
                    {
                        continue;
                    }
                }

                // Remove leading slash (anchors to the .gitignore directory, which scope already handles)
                if (line[0] == '/')
                {
                    line = line[1..];
                }

                _rules.Add(new GitignoreRule(scope, line, isNegation));
            }
        }
        catch { /* skip unreadable gitignore files */ }
    }

    private static bool MatchesPattern(string relativePath, string pattern)
    {
        var p = pattern.TrimEnd('/');
        var isDirectoryPattern = pattern.EndsWith('/');
        var fileName = GetFileName(relativePath);

        // Pattern contains a slash → it's a path-relative pattern
        if (p.Contains('/'))
        {
            return MatchesGlob(relativePath, p);
        }

        // No slash → matches against any file/directory name in the path
        // Exact file name match: ".env" matches "deploy/.env"
        if (string.Equals(fileName, p, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Wildcard pattern: "*.example" matches ".env.example"
        if (p.Contains('*'))
        {
            // Check against file name
            if (MatchesGlob(fileName, p))
            {
                return true;
            }

            // Also check against any path segment
            var segments = relativePath.Split('/');
            foreach (var segment in segments)
            {
                if (MatchesGlob(segment, p))
                {
                    return true;
                }
            }

            return false;
        }

        // Directory name match: "deploy" matches "deploy/foo.txt"
        if (relativePath.StartsWith(p + "/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Check if the pattern matches any directory segment in the path
        var parts = relativePath.Split('/');
        if (!isDirectoryPattern)
        {
            return false;
        }

        for (var i = 0; i < parts.Length - 1; i++)
        {
            if (string.Equals(parts[i], p, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>Simple glob matching supporting * (any chars within segment) and ** (any path segments).</summary>
    private static bool MatchesGlob(string path, string pattern)
    {
        // Handle ** (matches any number of directories)
        if (pattern.Contains("**"))
        {
            var parts = pattern.Split("**/", 2, StringSplitOptions.None);
            if (parts.Length == 2)
            {
                var suffix = parts[1];
                // "**/*.json" → check if any suffix of the path matches "*.json"
                if (MatchesGlob(path, suffix))
                {
                    return true;
                }

                var pathSegments = path.Split('/');
                for (var i = 1; i < pathSegments.Length; i++)
                {
                    var subPath = string.Join('/', pathSegments[i..]);
                    if (MatchesGlob(subPath, suffix))
                    {
                        return true;
                    }
                }

                return false;
            }
        }

        // Simple * wildcard matching (within a single segment or the whole string)
        return MatchesWildcard(path, pattern);
    }

    /// <summary>Matches a string against a pattern with * wildcards (case-insensitive).</summary>
    private static bool MatchesWildcard(string input, string pattern)
    {
        var ip = 0;
        var pp = 0;
        var starIp = -1;
        var starPp = -1;

        while (ip < input.Length)
        {
            if (pp < pattern.Length && pattern[pp] == '*')
            {
                starPp = pp++;
                starIp = ip;
            }
            else if (pp < pattern.Length && CharEqualsIgnoreCase(input[ip], pattern[pp]))
            {
                ip++;
                pp++;
            }
            else if (starPp >= 0)
            {
                pp = starPp + 1;
                ip = ++starIp;
            }
            else
            {
                return false;
            }
        }

        while (pp < pattern.Length && pattern[pp] == '*')
        {
            pp++;
        }

        return pp == pattern.Length;
    }

    private static bool CharEqualsIgnoreCase(char a, char b) =>
        char.ToLowerInvariant(a) == char.ToLowerInvariant(b);

    private static string GetFileName(string path)
    {
        var idx = path.LastIndexOf('/');
        return idx >= 0 ? path[(idx + 1)..] : path;
    }

    private record GitignoreRule(string Scope, string Pattern, bool IsNegation);
}
