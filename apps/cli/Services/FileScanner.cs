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
}

public sealed class FileScanner : IFileScanner
{
    private static readonly IReadOnlySet<string> excludedDirs = ExcludedDirectories.Names;

    private static readonly HashSet<string> envFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ".env", ".env.local", ".env.development", ".env.staging", ".env.production",
        ".env.test", ".env.example"
    };

    private static readonly HashSet<string> secretFileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"
    };

    private static readonly HashSet<string> secretFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "firebase-config.json", "service-account.json", "service-account-key.json",
        "credentials.json", "gcp-key.json"
    };

    public List<DiscoveredFile> FindDependencyFiles(string rootPath)
    {
        return ScanFiles(rootPath, FileCategory.Dependency, IsDependencyFile);
    }

    public List<DiscoveredFile> FindEnvFiles(string rootPath)
    {
        return ScanFiles(rootPath, FileCategory.Environment, IsEnvFile);
    }

    public List<DiscoveredFile> FindSecretFiles(string rootPath)
    {
        return ScanFiles(rootPath, FileCategory.SecretFile, IsSecretFile);
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
            !fileName.EndsWith(".bak", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (fileName.StartsWith("appsettings", StringComparison.OrdinalIgnoreCase) &&
            fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
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

        return secretFileNames.Contains(fileName);
    }
}
