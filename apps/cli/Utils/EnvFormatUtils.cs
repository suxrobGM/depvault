using System.Text.Json;
using DepVault.Cli.Crypto;

namespace DepVault.Cli.Utils;

/// <summary>A parsed env entry with an optional preceding comment block.</summary>
/// <param name="Key">The variable name.</param>
/// <param name="Value">The plaintext value.</param>
/// <param name="Comment">Comment text. A leading \n encodes a blank line before this entry.</param>
internal sealed record ParsedEnvEntry(string Key, string Value, string? Comment);

/// <summary>Shared parsing and serialization logic for .env and JSON config formats.</summary>
internal static class EnvFormatUtils
{
    /// <summary>Parse raw file content into entries, dispatching by format.</summary>
    public static List<ParsedEnvEntry> Parse(string content, string format)
    {
        if (format.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            return ParseJsonPairs(content)
                .Select(p => new ParsedEnvEntry(p.Key, p.Value, null))
                .ToList();
        }

        return ParseEnvPairs(content);
    }

    /// <summary>Serialize decrypted entries to the given format string.</summary>
    public static string Serialize(List<ParsedEnvEntry> entries, string format)
    {
        if (entries.Count == 0)
        {
            return "";
        }

        if (format.Equals("env", StringComparison.OrdinalIgnoreCase))
        {
            return SerializeEnv(entries);
        }

        if (format.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            var obj = new Dictionary<string, string>();
            foreach (var e in entries)
            {
                obj[e.Key] = e.Value;
            }

            return JsonSerializer.Serialize(obj, CryptoJsonContext.Default.DictionaryStringString) + "\n";
        }

        // Fallback: plain env format without comments
        return string.Join('\n', entries.Select(e => $"{e.Key}={EscapeEnvValue(e.Value)}")) + "\n";
    }

    private static string SerializeEnv(List<ParsedEnvEntry> entries)
    {
        var lines = new List<string>();
        var isFirst = true;

        foreach (var entry in entries)
        {
            var comment = entry.Comment ?? "";

            if (comment.StartsWith('\n'))
            {
                if (!isFirst)
                {
                    lines.Add("");
                }

                comment = comment[1..];
            }

            if (comment.Length > 0)
            {
                foreach (var commentLine in comment.Split('\n'))
                {
                    lines.Add($"# {commentLine}");
                }
            }

            lines.Add($"{entry.Key}={EscapeEnvValue(entry.Value)}");
            isFirst = false;
        }

        return string.Join('\n', lines) + "\n";
    }

    private static List<ParsedEnvEntry> ParseEnvPairs(string content)
    {
        var entries = new List<ParsedEnvEntry>();
        var pendingComment = new List<string>();
        var sawBlankLine = false;

        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.Trim();

            if (line.Length == 0)
            {
                sawBlankLine = entries.Count > 0 || pendingComment.Count > 0;
                pendingComment.Clear();
                continue;
            }

            if (line[0] == '#')
            {
                var commentText = line.Length > 1 ? line[1..].TrimStart() : "";
                pendingComment.Add(commentText);
                continue;
            }

            var eqIndex = line.IndexOf('=');
            if (eqIndex <= 0)
            {
                pendingComment.Clear();
                sawBlankLine = false;
                continue;
            }

            var key = line[..eqIndex].Trim();
            var value = line[(eqIndex + 1)..].Trim();

            if (value.Length >= 2 &&
                ((value[0] == '"' && value[^1] == '"') ||
                 (value[0] == '\'' && value[^1] == '\'')))
            {
                value = value[1..^1];
            }

            var commentBlock = pendingComment.Count > 0 ? string.Join("\n", pendingComment) : "";
            string? comment = (sawBlankLine || commentBlock.Length > 0)
                ? (sawBlankLine ? $"\n{commentBlock}" : commentBlock)
                : null;

            entries.Add(new ParsedEnvEntry(key, value, comment));
            pendingComment.Clear();
            sawBlankLine = false;
        }

        return entries;
    }

    private static List<KeyValuePair<string, string>> ParseJsonPairs(string content)
    {
        var pairs = new List<KeyValuePair<string, string>>();

        try
        {
            using var doc = JsonDocument.Parse(content);
            FlattenJsonElement(doc.RootElement, "", pairs);
        }
        catch (JsonException)
        {
            return ParseEnvPairs(content)
                .Select(e => new KeyValuePair<string, string>(e.Key, e.Value))
                .ToList();
        }

        return pairs;
    }

    private static void FlattenJsonElement(
        JsonElement element, string prefix, List<KeyValuePair<string, string>> pairs)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in element.EnumerateObject())
                {
                    var key = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}__{prop.Name}";
                    FlattenJsonElement(prop.Value, key, pairs);
                }
                break;

            case JsonValueKind.Array:
                var index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    FlattenJsonElement(item, $"{prefix}__{index}", pairs);
                    index++;
                }
                break;

            default:
                var value = element.ValueKind == JsonValueKind.String
                    ? element.GetString() ?? ""
                    : element.GetRawText();
                pairs.Add(new KeyValuePair<string, string>(prefix, value));
                break;
        }
    }

    internal static string EscapeEnvValue(string value)
    {
        if (value.Contains('"') || value.Contains('\n') || value.Contains(' ') || value.Contains('#'))
        {
            return $"\"{value.Replace("\\", "\\\\").Replace("\"", "\\\"")}\"";
        }

        return value;
    }
}
