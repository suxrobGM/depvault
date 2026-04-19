using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class CommentCodecTests
{
    [Fact]
    public void Encode_BothNull_ReturnsNull()
    {
        Assert.Null(CommentCodec.Encode(null, null));
    }

    [Fact]
    public void Encode_LeadingOnly_OmitsNullSeparator()
    {
        var result = CommentCodec.Encode(
            new CommentBlock(false, new[] { "hello" }, false),
            null);

        Assert.Equal("hello", result);
        Assert.DoesNotContain('\0', result!);
    }

    [Fact]
    public void Encode_TrailingOnly_IncludesNullSeparator()
    {
        var result = CommentCodec.Encode(
            null,
            new CommentBlock(false, new[] { "bye" }, false));

        Assert.Equal("\0bye", result);
    }

    [Fact]
    public void Encode_Both_SeparatedByNull()
    {
        var result = CommentCodec.Encode(
            new CommentBlock(false, new[] { "lead" }, false),
            new CommentBlock(false, new[] { "trail" }, false));

        Assert.Equal("lead\0trail", result);
    }

    [Fact]
    public void Encode_BlankLineFlags_EncodedAsSurroundingNewlines()
    {
        var result = CommentCodec.Encode(
            new CommentBlock(true, new[] { "c" }, true),
            null);

        Assert.Equal("\nc\n", result);
    }

    [Fact]
    public void Decode_Null_ReturnsPairOfNulls()
    {
        var (leading, trailing) = CommentCodec.Decode(null);
        Assert.Null(leading);
        Assert.Null(trailing);
    }

    [Fact]
    public void Decode_Empty_ReturnsPairOfNulls()
    {
        var (leading, trailing) = CommentCodec.Decode("");
        Assert.Null(leading);
        Assert.Null(trailing);
    }

    [Fact]
    public void Decode_PlainText_BecomesLeading()
    {
        var (leading, trailing) = CommentCodec.Decode("hello");

        Assert.NotNull(leading);
        Assert.Equal(new[] { "hello" }, leading!.Lines);
        Assert.Null(trailing);
    }

    [Fact]
    public void Decode_NullSeparator_SplitsLeadingAndTrailing()
    {
        var (leading, trailing) = CommentCodec.Decode("a\0b");

        Assert.Equal(new[] { "a" }, leading!.Lines);
        Assert.Equal(new[] { "b" }, trailing!.Lines);
    }

    [Fact]
    public void Decode_LeadingWithBlankFlags_Preserved()
    {
        var (leading, _) = CommentCodec.Decode("\ntext\n");

        Assert.True(leading!.BlankLineBefore);
        Assert.True(leading.BlankLineAfter);
        Assert.Equal(new[] { "text" }, leading.Lines);
    }

    [Theory]
    [InlineData(true, new[] { "x", "y" }, false, true, new[] { "z" }, false)]
    [InlineData(false, new[] { "only" }, true, false, new string[0], false)]
    [InlineData(true, new string[0], false, false, new[] { "t" }, true)]
    public void EncodeDecode_RoundTrips(
        bool lBefore, string[] lLines, bool lAfter,
        bool tBefore, string[] tLines, bool tAfter)
    {
        var leading = new CommentBlock(lBefore, lLines, lAfter);
        var trailing = new CommentBlock(tBefore, tLines, tAfter);

        var encoded = CommentCodec.Encode(leading, trailing);
        var (decLead, decTrail) = CommentCodec.Decode(encoded);

        Assert.Equal(leading.BlankLineBefore, decLead!.BlankLineBefore);
        Assert.Equal(leading.BlankLineAfter, decLead.BlankLineAfter);
        Assert.Equal(leading.Lines, decLead.Lines);

        if (trailing.Lines.Count == 0 && !trailing.BlankLineBefore && !trailing.BlankLineAfter)
        {
            Assert.Null(decTrail);
        }
        else
        {
            Assert.NotNull(decTrail);
            Assert.Equal(trailing.BlankLineBefore, decTrail.BlankLineBefore);
            Assert.Equal(trailing.BlankLineAfter, decTrail.BlankLineAfter);
            Assert.Equal(trailing.Lines, decTrail.Lines);
        }
    }
}
