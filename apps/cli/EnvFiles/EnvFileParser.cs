using System.Text;

namespace DepVault.Cli.EnvFiles;

/// <summary>Parses <c>.env</c>-formatted content into entries preserving comments and blank-line spacing.</summary>
internal static class EnvFileParser
{
    public static List<ParsedEnvEntry> Parse(string content)
    {
        var entries = new List<ParsedEnvEntry>();
        // Raw inter-variable lines: comment text (no #) or "" for a blank line.
        var pending = new List<string>();

        // Strip one trailing newline so the file terminator isn't captured as an intentional blank.
        if (content.EndsWith('\n')) content = content[..^1];

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
            var value = DecodeValue(line[(eqIndex + 1)..].Trim());

            entries.Add(new ParsedEnvEntry(key, value, BuildBlock(pending)));
            pending.Clear();
        }

        if (pending.Count > 0 && entries.Count > 0)
        {
            var trailing = BuildBlock(pending);
            if (trailing is not null)
            {
                entries[^1] = entries[^1] with { Trailing = trailing };
            }
            pending.Clear();
        }

        return entries;
    }

    private static string DecodeValue(string raw)
    {
        if (raw.Length < 2) return raw;
        var first = raw[0];
        var last = raw[^1];

        if (first == '"' && last == '"')
        {
            return DecodeDoubleQuoted(raw[1..^1]);
        }
        if (first == '\'' && last == '\'')
        {
            return raw[1..^1];
        }
        return raw;
    }

    private static string DecodeDoubleQuoted(string s)
    {
        var sb = new StringBuilder(s.Length);
        for (var i = 0; i < s.Length; i++)
        {
            if (s[i] == '\\' && i + 1 < s.Length)
            {
                sb.Append(s[i + 1] switch
                {
                    'n' => '\n',
                    't' => '\t',
                    'r' => '\r',
                    '"' => '"',
                    '\\' => '\\',
                    var c => c
                });
                i++;
            }
            else
            {
                sb.Append(s[i]);
            }
        }
        return sb.ToString();
    }

    private static CommentBlock? BuildBlock(List<string> pending)
    {
        if (pending.Count == 0) return null;

        var end = pending.Count;
        while (end > 0 && pending[end - 1] == "")
        {
            end--;
        }

        if (end == 0)
        {
            return new CommentBlock(true, Array.Empty<string>(), false);
        }

        var start = 0;
        while (start < end && pending[start] == "")
        {
            start++;
        }

        var lines = pending.GetRange(start, end - start);
        return new CommentBlock(start > 0, lines, end < pending.Count);
    }
}
