using System.Diagnostics;
using DepVault.Cli.Utils;

namespace DepVault.Cli.Services;

public enum FileCategory
{
    Dependency,
    Environment,
    SecretFile
}

public record DiscoveredFile(string FullPath, string RelativePath, string FileName, FileCategory Category);

public interface IFileScanner
{
    List<DiscoveredFile> FindDependencyFiles(string rootPath);
    List<DiscoveredFile> FindEnvFiles(string rootPath);
    List<DiscoveredFile> FindSecretFiles(string rootPath);
    List<DiscoveredFile> FindAllPushableFiles(string rootPath);
    FileCategory ClassifyFile(string fileName);
}

public sealed class FileScanner : IFileScanner
{
    private static readonly IReadOnlySet<string> excludedDirs = ExcludedDirectories.Names;

    private static readonly HashSet<string> envFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ".env", ".env.local", ".env.development", ".env.staging", ".env.production",
        ".env.test"
    };

    private static readonly HashSet<string> secretFileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"
    };

    private static readonly HashSet<string> secretFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "firebase-config.json", "service-account.json", "service-account-key.json",
        "credentials.json", "gcp-key.json", "google-services.json",
        "GoogleService-Info.plist"
    };

    private static readonly string[] secretFileNamePatterns = ["firebase-adminsdk"];

    public List<DiscoveredFile> FindDependencyFiles(string rootPath)
    {
        return ScanFiles(rootPath, FileCategory.Dependency, IsDependencyFile);
    }

    public List<DiscoveredFile> FindEnvFiles(string rootPath)
    {
        var files = ScanFiles(rootPath, FileCategory.Environment, IsEnvFile);
        return FilterGitTrackedConfigFiles(rootPath, files);
    }

    public List<DiscoveredFile> FindSecretFiles(string rootPath)
    {
        return ScanFiles(rootPath, FileCategory.SecretFile, IsSecretFile);
    }

    public List<DiscoveredFile> FindAllPushableFiles(string rootPath)
    {
        return FindEnvFiles(rootPath)
            .Concat(FindSecretFiles(rootPath))
            .OrderBy(f => f.RelativePath)
            .ToList();
    }

    public FileCategory ClassifyFile(string fileName)
    {
        if (IsEnvFile(fileName))
        {
            return FileCategory.Environment;
        }

        if (IsSecretFile(fileName))
        {
            return FileCategory.SecretFile;
        }

        return FileCategory.SecretFile;
    }

    private static List<DiscoveredFile> ScanFiles(string rootPath, FileCategory category, Func<string, bool> predicate)
    {
        var results = new List<DiscoveredFile>();
        var fullRoot = Path.GetFullPath(rootPath);

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
                if (IsInExcludedDirectory(filePath, fullRoot))
                {
                    continue;
                }

                var fileName = Path.GetFileName(filePath);
                if (predicate(fileName))
                {
                    var relativePath = Path.GetRelativePath(fullRoot, filePath).Replace('\\', '/');
                    results.Add(new DiscoveredFile(filePath, relativePath, fileName, category));
                }
            }
        }
        catch (UnauthorizedAccessException)
        {
        }
        catch (DirectoryNotFoundException)
        {
        }

        return results.OrderBy(f => f.RelativePath).ToList();
    }

    /// <summary>
    /// Filters out files in excluded directories like node_modules, vendor, .git, etc.
    /// This is important to avoid suggesting irrelevant files for push/pull and to prevent accidental large uploads.
    /// </summary>
    private static bool IsInExcludedDirectory(string filePath, string rootPath)
    {
        var relativePath = Path.GetRelativePath(rootPath, filePath);
        var parts = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        for (var i = 0; i < parts.Length - 1; i++)
        {
            if (excludedDirs.Contains(parts[i]))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsDependencyFile(string fileName)
    {
        return EcosystemResolver.IsDependencyFile(fileName);
    }

    private static bool IsEnvFile(string fileName)
    {
        if (envFileNames.Contains(fileName))
        {
            return true;
        }

        if (fileName.StartsWith(".env.", StringComparison.OrdinalIgnoreCase) &&
            !fileName.EndsWith(".bak", StringComparison.OrdinalIgnoreCase) &&
            !fileName.EndsWith(".example", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (fileName.Equals("appsettings.json", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (fileName.StartsWith("appsettings.", StringComparison.OrdinalIgnoreCase) &&
            fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase) &&
            fileName.Count(c => c == '.') == 2)
        {
            return true;
        }

        return fileName.Equals("secrets.yaml", StringComparison.OrdinalIgnoreCase)
               || fileName.Equals("secrets.yml", StringComparison.OrdinalIgnoreCase)
               || fileName.Equals("config.toml", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSecretFile(string fileName)
    {
        var ext = Path.GetExtension(fileName);
        if (secretFileExtensions.Contains(ext))
        {
            return true;
        }

        if (secretFileNames.Contains(fileName))
        {
            return true;
        }

        return secretFileNamePatterns.Any(p => fileName.Contains(p, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Filters out config files (appsettings.json, secrets.yaml, config.toml) that are tracked
    /// by git. Tracked config files typically contain placeholders, not real secrets.
    /// Only gitignored/untracked config files are suggested for push/pull.
    /// Plain .env files are always included regardless of git status.
    /// </summary>
    private static List<DiscoveredFile> FilterGitTrackedConfigFiles(string rootPath, List<DiscoveredFile> files)
    {
        var configFiles = files.Where(f => IsConfigStyleFile(f.FileName)).ToList();
        if (configFiles.Count == 0)
        {
            return files;
        }

        var gitIgnored = GetGitIgnoredPaths(rootPath, configFiles);

        return files
            .Where(f => !IsConfigStyleFile(f.FileName) || gitIgnored.Contains(f.RelativePath))
            .ToList();
    }

    private static bool IsConfigStyleFile(string fileName)
    {
        return fileName.StartsWith("appsettings", StringComparison.OrdinalIgnoreCase)
               || fileName.Equals("secrets.yaml", StringComparison.OrdinalIgnoreCase)
               || fileName.Equals("secrets.yml", StringComparison.OrdinalIgnoreCase)
               || fileName.Equals("config.toml", StringComparison.OrdinalIgnoreCase);
    }

    private static HashSet<string> GetGitIgnoredPaths(string rootPath, List<DiscoveredFile> files)
    {
        var ignored = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var paths = string.Join('\n', files.Select(f => f.RelativePath));
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
                return ignored;
            }

            process.StandardInput.Write(paths);
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
            // Not a git repo or git not available — include all files
            foreach (var f in files)
            {
                ignored.Add(f.RelativePath);
            }
        }

        return ignored;
    }
}
