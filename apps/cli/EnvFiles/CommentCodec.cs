using System.Text;

namespace DepVault.Cli.EnvFiles;

/// <summary>
/// Encodes/decodes <see cref="CommentBlock"/> pairs to/from a single wire string.
///
/// Wire format: <c>encoded_leading [\0 encoded_trailing]</c>, where each block is
/// <c>[\n] lines_joined_by_\n [\n]</c> (leading/trailing <c>\n</c> encode surrounding blank lines).
/// </summary>
internal static class CommentCodec
{
    /// <summary>
    /// Encodes leading/trailing comment blocks into a single string for storage in the vault.
    /// </summary>
    public static string? Encode(CommentBlock? leading, CommentBlock? trailing)
    {
        var lead = EncodeBlock(leading);
        var trail = EncodeBlock(trailing);

        if (lead is null && trail is null) return null;
        if (trail is null) return lead;
        return (lead ?? "") + "\0" + trail;
    }

    /// <summary>
    /// Decodes a wire string into leading/trailing comment blocks. Null or empty input yields (null, null).
    /// </summary>
    /// <param name="wire">The encoded comment blocks string from the vault.</param>
    public static (CommentBlock? Leading, CommentBlock? Trailing) Decode(string? wire)
    {
        if (string.IsNullOrEmpty(wire)) return (null, null);

        var nulIdx = wire.IndexOf('\0');
        if (nulIdx < 0) return (DecodeBlock(wire), null);

        var lead = nulIdx > 0 ? DecodeBlock(wire[..nulIdx]) : null;
        var trail = DecodeBlock(wire[(nulIdx + 1)..]);
        return (lead, trail);
    }

    private static string? EncodeBlock(CommentBlock? block)
    {
        if (block is null) return null;

        var sb = new StringBuilder();
        if (block.BlankLineBefore) sb.Append('\n');
        sb.Append(string.Join('\n', block.Lines));
        if (block.BlankLineAfter) sb.Append('\n');

        return sb.Length > 0 ? sb.ToString() : null;
    }

    private static CommentBlock? DecodeBlock(string text)
    {
        if (text.Length == 0) return null;

        var blankBefore = text.StartsWith('\n');
        if (blankBefore) text = text[1..];

        var blankAfter = text.EndsWith('\n');
        if (blankAfter) text = text[..^1];

        var lines = text.Length > 0 ? text.Split('\n') : Array.Empty<string>();
        return new CommentBlock(blankBefore, lines, blankAfter);
    }
}
