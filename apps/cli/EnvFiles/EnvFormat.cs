namespace DepVault.Cli.EnvFiles;

/// <summary>Supported env file formats.</summary>
public enum EnvFileFormat
{
    Env,
    Json
}

/// <summary>A contiguous block of comment lines with optional surrounding blank lines.</summary>
/// <param name="BlankLineBefore">True if a blank line precedes this block.</param>
/// <param name="Lines">Comment text (no leading <c>#</c>).</param>
/// <param name="BlankLineAfter">True if a blank line follows this block.</param>
public sealed record CommentBlock(
    bool BlankLineBefore,
    IReadOnlyList<string> Lines,
    bool BlankLineAfter);

/// <summary>A parsed env entry with optional leading/trailing comment blocks.</summary>
public sealed record ParsedEnvEntry(
    string Key,
    string Value,
    CommentBlock? Leading = null,
    CommentBlock? Trailing = null);

/// <summary>Facade dispatching parse/serialize by format.</summary>
public static class EnvFormat
{
    /// <summary>
    /// Parses env file content into a list of entries with preserved comments and spacing, based on the specified format.
    /// </summary>
    /// <param name="content">The content of the env file to parse.</param>
    /// <param name="format">The format of the env file.</param>
    /// <returns>A list of parsed env entries.</returns>
    public static List<ParsedEnvEntry> Parse(string content, EnvFileFormat format) =>
        format == EnvFileFormat.Json
            ? JsonFileParser.Parse(content)
            : EnvFileParser.Parse(content);

    /// <summary>
    /// Serializes a list of env entries into a string, based on the specified format.
    /// </summary>
    /// <param name="entries">The list of env entries to serialize.</param>
    /// <param name="format">The format of the env file.</param>
    /// <returns>The serialized content of the env file.</returns>
    public static string Serialize(List<ParsedEnvEntry> entries, EnvFileFormat format)
    {
        if (entries.Count == 0) return "";
        return format == EnvFileFormat.Json
            ? JsonFileParser.Serialize(entries)
            : EnvFileSerializer.Serialize(entries);
    }

    /// <summary>Detect format from file name extension.</summary>
    public static EnvFileFormat Detect(string fileName) =>
        fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
            ? EnvFileFormat.Json
            : EnvFileFormat.Env;
}
