using DepVault.Cli.Services;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Suggests vault tags and vault name suffixes from env file naming conventions.
/// Replaces the old env-type auto-detection: filenames like <c>.env.production</c>
/// map to <c>prod</c>, <c>.env.local</c> to <c>dev</c>, etc.
/// </summary>
public static class TagSuggester
{
    private static readonly (string Segment, string Tag)[] Rules =
    [
        ("production", "prod"),
        ("prod", "prod"),
        ("staging", "staging"),
        ("stage", "staging"),
        ("preview", "preview"),
        ("development", "dev"),
        ("dev", "dev"),
        ("local", "dev"),
        ("test", "test"),
    ];

    /// <summary>Returns the inferred tag for a filename, or null if nothing matches.</summary>
    public static string? Suggest(string fileName)
    {
        var segments = fileName.ToLowerInvariant().Split(['.', '-', '_']);
        foreach (var segment in segments)
        {
            foreach (var (seg, tag) in Rules)
            {
                if (segment == seg)
                {
                    return tag;
                }
            }
        }
        return null;
    }

    /// <summary>Returns the same tag list derived from each discovered file's name (no duplicates).</summary>
    public static List<string> SuggestForFiles(IEnumerable<DiscoveredFile> files)
    {
        var tags = new HashSet<string>();
        foreach (var file in files)
        {
            var tag = Suggest(file.FileName);
            if (tag is not null)
            {
                tags.Add(tag);
            }
        }
        return [.. tags];
    }
}
