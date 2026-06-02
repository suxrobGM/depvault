using System.Text;

namespace DepVault.Cli.Services;

/// <summary>
/// Derives an environment slug (open-set string) from a config/secret file name.
/// </summary>
/// <remarks>
/// Rules:
/// <list type="bullet">
///   <item>Suffix-less <c>appsettings.json</c> or a bare <c>.env</c> → <c>"base"</c>.</item>
///   <item><c>appsettings.&lt;X&gt;.json</c> or <c>.env.&lt;X&gt;</c> → slugified, lower-cased <c>X</c>
///   with common aliases applied. Unknown segments keep their own lower-cased slug
///   (never collapsed to <c>base</c>).</item>
/// </list>
/// </remarks>
internal static class EnvSlugResolver
{
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["development"] = "dev",
        ["dev"] = "dev",
        ["production"] = "prod",
        ["prod"] = "prod",
        ["stage"] = "staging",
        ["staging"] = "staging",
        ["local"] = "local",
        ["test"] = "test"
    };

    /// <summary>Resolves the environment slug for the given file name.</summary>
    public static string Resolve(string fileName)
    {
        var segment = ExtractEnvSegment(fileName);

        if (string.IsNullOrEmpty(segment))
        {
            return "base";
        }

        return Aliases.TryGetValue(segment, out var alias) ? alias : Slugify(segment);
    }

    /// <summary>
    /// Extracts the environment-bearing segment from a file name, or null/empty when the
    /// file is the base variant.
    /// </summary>
    private static string? ExtractEnvSegment(string fileName)
    {
        // Bare .env → base
        if (fileName.Equals(".env", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // .env.<X>  (X may contain further dots, e.g. .env.local.test)
        if (fileName.StartsWith(".env.", StringComparison.OrdinalIgnoreCase))
        {
            return fileName[".env.".Length..];
        }

        // appsettings.json → base
        if (fileName.Equals("appsettings.json", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // appsettings.<X>.json
        if (fileName.StartsWith("appsettings.", StringComparison.OrdinalIgnoreCase)
            && fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            var inner = fileName["appsettings.".Length..^".json".Length];
            return string.IsNullOrEmpty(inner) ? null : inner;
        }

        // Unknown file shape → no environment segment.
        return null;
    }

    /// <summary>Lower-cases and slugifies an arbitrary environment segment.</summary>
    private static string Slugify(string value)
    {
        var sb = new StringBuilder(value.Length);
        var lower = value.ToLowerInvariant();
        var previousDash = false;

        foreach (var ch in lower)
        {
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
                previousDash = false;
            }
            else if (!previousDash && sb.Length > 0)
            {
                sb.Append('-');
                previousDash = true;
            }
        }

        var slug = sb.ToString().Trim('-');
        return string.IsNullOrEmpty(slug) ? "base" : slug;
    }
}
