using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class EnvFileSerializerTests
{
    [Fact]
    public void Serialize_SimpleEntry_WritesKeyValueWithTrailingNewline()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("FOO", "bar")]);
        Assert.Equal("FOO=bar\n", result);
    }

    [Fact]
    public void Serialize_MultipleEntries_JoinsWithNewlines()
    {
        var result = EnvFileSerializer.Serialize(
        [
            new ParsedEnvEntry("A", "1"),
            new ParsedEnvEntry("B", "2"),
        ]);

        Assert.Equal("A=1\nB=2\n", result);
    }

    [Fact]
    public void Serialize_ValueWithSpace_IsQuoted()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("MSG", "hello world")]);
        Assert.Equal("MSG=\"hello world\"\n", result);
    }

    [Fact]
    public void Serialize_ValueWithNewline_IsQuotedAndEscaped()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("K", "a\nb")]);
        Assert.Equal("K=\"a\\nb\"\n", result);
    }

    [Fact]
    public void Serialize_ValueWithQuote_IsEscaped()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("K", "a\"b")]);
        Assert.Equal("K=\"a\\\"b\"\n", result);
    }

    [Fact]
    public void Serialize_ValueWithBackslash_IsEscaped()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("K", "a\\b")]);
        Assert.Equal("K=\"a\\\\b\"\n", result);
    }

    [Fact]
    public void Serialize_ValueWithHash_IsQuoted()
    {
        var result = EnvFileSerializer.Serialize([new ParsedEnvEntry("K", "abc#def")]);
        Assert.Equal("K=\"abc#def\"\n", result);
    }

    [Fact]
    public void Serialize_LeadingCommentBlock_PrecedesEntry()
    {
        var entry = new ParsedEnvEntry("FOO", "bar",
            Leading: new CommentBlock(false, new[] { "note" }, false));

        var result = EnvFileSerializer.Serialize([entry]);
        Assert.Equal("# note\nFOO=bar\n", result);
    }

    [Fact]
    public void Serialize_BlankLineBefore_OnFirstEntry_IsSuppressed()
    {
        var entry = new ParsedEnvEntry("FOO", "bar",
            Leading: new CommentBlock(true, new[] { "note" }, false));

        var result = EnvFileSerializer.Serialize([entry]);
        Assert.Equal("# note\nFOO=bar\n", result);
    }

    [Fact]
    public void Serialize_BlankLineBefore_OnLaterEntry_IsEmitted()
    {
        var entries = new List<ParsedEnvEntry>
        {
            new("A", "1"),
            new("B", "2", Leading: new CommentBlock(true, new[] { "section" }, false)),
        };

        var result = EnvFileSerializer.Serialize(entries);
        Assert.Equal("A=1\n\n# section\nB=2\n", result);
    }

    [Fact]
    public void Serialize_TrailingCommentBlock_FollowsEntry()
    {
        var entry = new ParsedEnvEntry("FOO", "bar",
            Trailing: new CommentBlock(false, new[] { "end" }, false));

        var result = EnvFileSerializer.Serialize([entry]);
        Assert.Equal("FOO=bar\n# end\n", result);
    }

    [Fact]
    public void Serialize_EmptyList_ReturnsEmpty()
    {
        Assert.Equal("", EnvFileSerializer.Serialize([]));
    }
}
