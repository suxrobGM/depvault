using System.Text.Json;
using DepVault.Cli.Crypto;

namespace DepVault.Cli.EnvFiles;

/// <summary>Parses JSON config files (e.g. <c>appsettings.json</c>) into flattened key/value pairs.</summary>
internal static class JsonFileParser
{
    /// <summary>
    /// Parses JSON content into a list of env entries, flattening nested structures with double underscores and converting non-string primitives to their raw text representation.
    /// </summary>
    /// <param name="content">The JSON content to parse.</param>
    /// <returns>A list of parsed env entries.</returns>
    public static List<ParsedEnvEntry> Parse(string content)
    {
        var entries = new List<ParsedEnvEntry>();
        using var doc = JsonDocument.Parse(content);
        Flatten(doc.RootElement, "", entries);
        return entries;
    }

    /// <summary>
    /// Serializes a list of env entries into JSON content, unflattening keys with double underscores into nested objects and arrays, and encoding values as strings.
    /// </summary>
    /// <param name="entries">The list of env entries to serialize.</param>
    /// <returns>The serialized JSON content.</returns>
    public static string Serialize(List<ParsedEnvEntry> entries)
    {
        var obj = new Dictionary<string, string>();
        foreach (var entry in entries)
        {
            obj[entry.Key] = entry.Value;
        }

        return JsonSerializer.Serialize(obj, CryptoJsonContext.Default.DictionaryStringString) + "\n";
    }

    private static void Flatten(JsonElement element, string prefix, List<ParsedEnvEntry> entries)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in element.EnumerateObject())
                {
                    var key = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}__{prop.Name}";
                    Flatten(prop.Value, key, entries);
                }
                break;

            case JsonValueKind.Array:
                var index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    Flatten(item, $"{prefix}__{index}", entries);
                    index++;
                }
                break;

            default:
                var value = element.ValueKind == JsonValueKind.String
                    ? element.GetString() ?? ""
                    : element.GetRawText();
                entries.Add(new ParsedEnvEntry(prefix, value));
                break;
        }
    }
}
