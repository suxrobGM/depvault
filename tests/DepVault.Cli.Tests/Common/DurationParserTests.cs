using DepVault.Cli.Common;

namespace DepVault.Cli.Tests.Common;

/// <summary>Tests TTL parsing for the remembered-unlock feature: valid suffixes, rejection, and clamping.</summary>
public sealed class DurationParserTests
{
    [Theory]
    [InlineData("90s", 90)]
    [InlineData("30m", 30 * 60)]
    [InlineData("8h", 8 * 60 * 60)]
    [InlineData("7d", 7 * 24 * 60 * 60)]
    [InlineData("7D", 7 * 24 * 60 * 60)]
    public void TryParse_ValidUnits_ReturnsExpectedSeconds(string input, double expectedSeconds)
    {
        Assert.Equal(expectedSeconds, DurationParser.TryParse(input)!.Value.TotalSeconds);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("abc")]
    [InlineData("5x")]
    [InlineData("-3h")]
    [InlineData("0d")]
    [InlineData("h")]
    [InlineData("12")]
    public void TryParse_Invalid_ReturnsNull(string? input)
    {
        Assert.Null(DurationParser.TryParse(input));
    }

    [Fact]
    public void ResolveTtl_Blank_UsesDefault()
    {
        Assert.Equal(DurationParser.DefaultTtl, DurationParser.ResolveTtl(null));
        Assert.Equal(DurationParser.DefaultTtl, DurationParser.ResolveTtl("  "));
    }

    [Fact]
    public void ResolveTtl_Invalid_ReturnsNull()
    {
        Assert.Null(DurationParser.ResolveTtl("garbage"));
    }

    [Fact]
    public void ResolveTtl_AboveMax_ClampsToMax()
    {
        Assert.Equal(DurationParser.MaxTtl, DurationParser.ResolveTtl("365d"));
    }

    [Fact]
    public void ResolveTtl_WithinRange_ReturnsParsed()
    {
        Assert.Equal(TimeSpan.FromHours(8), DurationParser.ResolveTtl("8h"));
    }
}
