using System.Reflection;
using System.Runtime.Serialization;

namespace DepVault.Cli.Utils;

/// <summary>Pure utility methods for command-line parsing (no DI deps).</summary>
internal static class CommandUtils
{
    internal static readonly string[] EnvironmentTypes = ["DEVELOPMENT", "STAGING", "PRODUCTION", "GLOBAL"];

    /// <summary>
    /// Parses a Kiota-generated enum by member name or [EnumMember] value attribute.
    /// Handles values like "appsettings.json" that don't match the C# member name.
    /// </summary>
    public static T ParseEnum<T>(string value, T fallback) where T : struct, Enum
    {
        if (Enum.TryParse<T>(value, true, out var result))
        {
            return result;
        }

        var enumFields = typeof(T).GetFields(BindingFlags.Public | BindingFlags.Static);

        foreach (var field in enumFields)
        {
            var attr = field.GetCustomAttributes(typeof(EnumMemberAttribute), false);
            if (attr.Length > 0 && ((EnumMemberAttribute)attr[0]).Value == value)
            {
                return (T)field.GetValue(null)!;
            }
        }

        return fallback;
    }
}
