using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class EnvRoundTripTests
{
    [Theory]
    [InlineData("FOO=bar\n")]
    [InlineData("A=1\nB=2\nC=3\n")]
    [InlineData("# top comment\nFOO=bar\n")]
    [InlineData("A=1\n\n# section\nB=2\n")]
    [InlineData("# multi\n# line\n# comment\nFOO=bar\n")]
    [InlineData("A=1\n# trailing\n")]
    public void Parse_Then_Serialize_RoundTrips(string content)
    {
        var parsed = EnvFileParser.Parse(content);
        var emitted = EnvFileSerializer.Serialize(parsed);
        Assert.Equal(content, emitted);
    }

    [Fact]
    public void RoundTrip_ValuesWithSpecialChars_Preserved()
    {
        var original = new List<ParsedEnvEntry>
        {
            new("WITH_SPACE", "hello world"),
            new("WITH_QUOTE", "she said \"hi\""),
            new("WITH_BACKSLASH", "path\\to\\file"),
            new("WITH_NEWLINE", "line1\nline2"),
            new("WITH_HASH", "val#not-comment"),
            new("SIMPLE", "plain_value-123"),
        };

        var serialized = EnvFileSerializer.Serialize(original);
        var parsed = EnvFileParser.Parse(serialized);

        Assert.Equal(original.Count, parsed.Count);
        for (var i = 0; i < original.Count; i++)
        {
            Assert.Equal(original[i].Key, parsed[i].Key);
            Assert.Equal(original[i].Value, parsed[i].Value);
        }
    }

    [Fact]
    public void RoundTrip_ComplexCommentLayout_Preserved()
    {
        var content =
            "# top\nA=1\n" +
            "\n" +
            "# section2\nB=2\n" +
            "C=3\n" +
            "# trail\n";

        var parsed = EnvFileParser.Parse(content);
        var emitted = EnvFileSerializer.Serialize(parsed);
        Assert.Equal(content, emitted);
    }
}
