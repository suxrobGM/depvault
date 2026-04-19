using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class EnvFileParserTests
{
    [Fact]
    public void Parse_EmptyContent_ReturnsEmpty()
    {
        Assert.Empty(EnvFileParser.Parse(""));
    }

    [Fact]
    public void Parse_SimpleKeyValue_ExtractsPair()
    {
        var entries = EnvFileParser.Parse("FOO=bar\n");

        Assert.Single(entries);
        Assert.Equal("FOO", entries[0].Key);
        Assert.Equal("bar", entries[0].Value);
        Assert.Null(entries[0].Leading);
        Assert.Null(entries[0].Trailing);
    }

    [Fact]
    public void Parse_MultipleEntries_PreservesOrder()
    {
        var entries = EnvFileParser.Parse("A=1\nB=2\nC=3\n");

        Assert.Equal(3, entries.Count);
        Assert.Equal(new[] { "A", "B", "C" }, entries.Select(e => e.Key));
        Assert.Equal(new[] { "1", "2", "3" }, entries.Select(e => e.Value));
    }

    [Fact]
    public void Parse_DoubleQuotedValue_StripsQuotes()
    {
        var entries = EnvFileParser.Parse("FOO=\"hello world\"\n");
        Assert.Equal("hello world", entries[0].Value);
    }

    [Fact]
    public void Parse_SingleQuotedValue_StripsQuotesButDoesNotUnescape()
    {
        var entries = EnvFileParser.Parse("FOO='a\\nb'\n");
        Assert.Equal("a\\nb", entries[0].Value);
    }

    [Fact]
    public void Parse_DoubleQuoted_DecodesNewlineEscape()
    {
        var entries = EnvFileParser.Parse("FOO=\"line1\\nline2\"\n");
        Assert.Equal("line1\nline2", entries[0].Value);
    }

    [Fact]
    public void Parse_DoubleQuoted_DecodesQuoteAndBackslash()
    {
        var entries = EnvFileParser.Parse("FOO=\"a\\\"b\\\\c\"\n");
        Assert.Equal("a\"b\\c", entries[0].Value);
    }

    [Fact]
    public void Parse_CommentBeforeEntry_BecomesLeadingBlock()
    {
        var entries = EnvFileParser.Parse("# a comment\nFOO=bar\n");

        Assert.NotNull(entries[0].Leading);
        Assert.Equal(new[] { "a comment" }, entries[0].Leading!.Lines);
        Assert.False(entries[0].Leading!.BlankLineBefore);
        Assert.False(entries[0].Leading!.BlankLineAfter);
    }

    [Fact]
    public void Parse_CommentWithBlankBefore_SetsBlankLineBefore()
    {
        var entries = EnvFileParser.Parse("A=1\n\n# second\nB=2\n");

        Assert.Equal(2, entries.Count);
        Assert.NotNull(entries[1].Leading);
        Assert.True(entries[1].Leading!.BlankLineBefore);
        Assert.Equal(new[] { "second" }, entries[1].Leading!.Lines);
    }

    [Fact]
    public void Parse_CommentWithBlankAfter_SetsBlankLineAfter()
    {
        var entries = EnvFileParser.Parse("# first\n\nFOO=bar\n");

        Assert.NotNull(entries[0].Leading);
        Assert.False(entries[0].Leading!.BlankLineBefore);
        Assert.True(entries[0].Leading!.BlankLineAfter);
    }

    [Fact]
    public void Parse_MultilineCommentBlock_JoinsLines()
    {
        var entries = EnvFileParser.Parse("# line1\n# line2\n# line3\nFOO=bar\n");

        Assert.Equal(new[] { "line1", "line2", "line3" }, entries[0].Leading!.Lines);
    }

    [Fact]
    public void Parse_OnlyBlankLinesBetweenEntries_MarksSpacing()
    {
        var entries = EnvFileParser.Parse("A=1\n\n\nB=2\n");

        Assert.NotNull(entries[1].Leading);
        Assert.Empty(entries[1].Leading!.Lines);
        Assert.True(entries[1].Leading!.BlankLineBefore);
    }

    [Fact]
    public void Parse_TrailingComment_AttachesToLastEntry()
    {
        var entries = EnvFileParser.Parse("FOO=bar\n# trailing\n");

        Assert.Single(entries);
        Assert.NotNull(entries[0].Trailing);
        Assert.Equal(new[] { "trailing" }, entries[0].Trailing!.Lines);
    }

    [Fact]
    public void Parse_CommentStrippedWhenNoFollowingEntry_NotLost()
    {
        var entries = EnvFileParser.Parse("# orphan\n");
        Assert.Empty(entries);
    }

    [Fact]
    public void Parse_InvalidLineBetweenComments_ResetsPending()
    {
        var entries = EnvFileParser.Parse("# c1\nno-equals\n# c2\nFOO=bar\n");

        Assert.Single(entries);
        Assert.Equal(new[] { "c2" }, entries[0].Leading!.Lines);
    }

    [Fact]
    public void Parse_WindowsLineEndings_Handled()
    {
        var entries = EnvFileParser.Parse("A=1\r\nB=2\r\n");

        Assert.Equal(2, entries.Count);
        Assert.Equal("1", entries[0].Value);
        Assert.Equal("2", entries[1].Value);
    }

    [Fact]
    public void Parse_EqualsInValue_KeepsRest()
    {
        var entries = EnvFileParser.Parse("URL=postgres://user:pass@host/db?sslmode=require\n");
        Assert.Equal("postgres://user:pass@host/db?sslmode=require", entries[0].Value);
    }
}
