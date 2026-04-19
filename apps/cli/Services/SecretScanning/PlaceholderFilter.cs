using System.Text.RegularExpressions;

namespace DepVault.Cli.Services.SecretScanning;

/// <summary>Detects placeholder/template values that aren't real secrets.</summary>
internal static partial class PlaceholderFilter
{
    public static bool IsPlaceholder(string line)
    {
        var trimmed = line.Trim();

        if (trimmed.Length == 0 || trimmed[0] == '#')
        {
            return true;
        }

        var isPlaceholder = trimmed.StartsWith("<PLACEHOLDER>", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("<YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("your_", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("your-", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("xxxxxxxx", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("changeme", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("change-me", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("change-in-production", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("change_in_production", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("replace_me", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("replace-me", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("example.com", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("dummy", StringComparison.OrdinalIgnoreCase);

        if (isPlaceholder)
        {
            return true;
        }

        return VarRefRegex().IsMatch(trimmed) || EmptyValueRegex().IsMatch(trimmed);
    }

    [GeneratedRegex(@"=\s*\$\{[A-Z_]+\}", RegexOptions.Compiled)]
    private static partial Regex VarRefRegex();

    [GeneratedRegex(@"=\s*['""]?\s*['""]?\s*$", RegexOptions.Compiled)]
    private static partial Regex EmptyValueRegex();
}
