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

        if (trimmed.Contains("<PLACEHOLDER>", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("<YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("your_", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("xxxxxxxx", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("changeme", StringComparison.OrdinalIgnoreCase)
            || trimmed.Contains("replace_me", StringComparison.OrdinalIgnoreCase))
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
