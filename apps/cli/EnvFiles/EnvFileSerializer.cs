namespace DepVault.Cli.EnvFiles;

/// <summary>Serializes <see cref="ParsedEnvEntry"/> values into <c>.env</c> file content.</summary>
internal static class EnvFileSerializer
{
    public static string Serialize(List<ParsedEnvEntry> entries)
    {
        if (entries.Count == 0) return "";

        var lines = new List<string>();
        var isFirst = true;

        foreach (var entry in entries)
        {
            EmitBlock(lines, entry.Leading, allowLeadingBlank: !isFirst);
            lines.Add($"{entry.Key}={EscapeValue(entry.Value)}");
            EmitBlock(lines, entry.Trailing, allowLeadingBlank: true);
            isFirst = false;
        }

        return string.Join('\n', lines) + "\n";
    }

    private static void EmitBlock(List<string> lines, CommentBlock? block, bool allowLeadingBlank)
    {
        if (block is null) return;

        if (block.BlankLineBefore && allowLeadingBlank)
        {
            lines.Add("");
        }

        foreach (var line in block.Lines)
        {
            lines.Add($"# {line}");
        }

        if (block.BlankLineAfter)
        {
            lines.Add("");
        }
    }

    internal static string EscapeValue(string value)
    {
        if (!NeedsQuoting(value)) return value;

        var escaped = value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n");

        return $"\"{escaped}\"";
    }

    private static bool NeedsQuoting(string v) =>
        v.Contains('"') || v.Contains('\n') || v.Contains(' ') ||
        v.Contains('#') || v.Contains('\\');
}
