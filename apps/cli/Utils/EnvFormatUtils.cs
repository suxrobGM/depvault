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

            // Split leading from trailing comment (separated by \0)
            string trailing = "";
            var nulIdx = comment.IndexOf('\0');
            if (nulIdx >= 0)
            {
                trailing = comment[(nulIdx + 1)..];
                comment = comment[..nulIdx];
            }

            EmitCommentBlock(lines, comment, !isFirst);
            lines.Add($"{entry.Key}={EscapeEnvValue(entry.Value)}");

            if (trailing.Length > 0)
            {
                EmitCommentBlock(lines, trailing, true);
            }

            isFirst = false;
        }

        return string.Join('\n', lines) + "\n";
    }

    private static void EmitCommentBlock(List<string> lines, string block, bool allowBlankLine)
    {
        if (block.Length == 0) return;

        var text = block;
        if (text.StartsWith('\n'))
        {
            if (allowBlankLine) lines.Add("");
            text = text[1..];
        }

        var hasTrailingBlank = text.EndsWith('\n');
        if (hasTrailingBlank)
        {
            text = text[..^1];
        }

        if (text.Length > 0)
        {
            foreach (var commentLine in text.Split('\n'))
            {
                lines.Add($"# {commentLine}");
            }
        }

        if (hasTrailingBlank)
        {
            lines.Add("");
        }
    }

    private static List<ParsedEnvEntry> ParseEnvPairs(string content)
    {
        var entries = new List<ParsedEnvEntry>();
        // Raw inter-variable lines: comment text (without #) or "" for blank lines.
        var pending = new List<string>();

        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.Trim();

            if (line.Length == 0)
            {
                if (entries.Count > 0 || pending.Count > 0)
                    pending.Add("");
                continue;
            }

            if (line[0] == '#')
            {
                pending.Add(line.Length > 1 ? line[1..].TrimStart() : "");
                continue;
            }

            var eqIndex = line.IndexOf('=');
            if (eqIndex <= 0)
            {
                pending.Clear();
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

            entries.Add(new ParsedEnvEntry(key, value, EncodePending(pending)));
            pending.Clear();
        }

        // Trailing lines after the last variable
        if (pending.Count > 0 && entries.Count > 0)
        {
            var trailing = EncodePending(pending);
            if (trailing is not null)
            {
                var last = entries[^1];
                entries[^1] = last with
                {
                    Comment = last.Comment is not null ? $"{last.Comment}\0{trailing}" : $"\0{trailing}"
                };
            }
            pending.Clear();
        }

        return entries;
    }

    private static string? EncodePending(List<string> pending)
    {
        if (pending.Count == 0) return null;

        var end = pending.Count;
        while (end > 0 && pending[end - 1] == "")
        {
            end--;
        }

        if (end == 0) return "\n"; // All blank lines → spacing only

        var hasTrailingBlank = end < pending.Count;

        var start = 0;
        while (start < end && pending[start] == "")
        {
            start++;
        }

        var result = start > 0 ? "\n" : "";
        for (var i = start; i < end; i++)
        {
            if (i > start) result += "\n";
            result += pending[i];
        }

        if (hasTrailingBlank)
        {
            result += "\n";
        }

        return result.Length > 0 ? result : null;
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
