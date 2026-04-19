using System.Text.Json;
using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class JsonFileParserTests
{
    [Fact]
    public void Parse_FlatObject_ExtractsKeys()
    {
        var entries = JsonFileParser.Parse("""{"A":"1","B":"2"}""");

        Assert.Equal(2, entries.Count);
        Assert.Equal("A", entries[0].Key);
        Assert.Equal("1", entries[0].Value);
        Assert.Equal("B", entries[1].Key);
        Assert.Equal("2", entries[1].Value);
    }

    [Fact]
    public void Parse_NestedObject_FlattensWithDoubleUnderscore()
    {
        var entries = JsonFileParser.Parse("""{"ConnectionStrings":{"Default":"Host=db"}}""");

        Assert.Single(entries);
        Assert.Equal("ConnectionStrings__Default", entries[0].Key);
        Assert.Equal("Host=db", entries[0].Value);
    }

    [Fact]
    public void Parse_DeeplyNested_Flattens()
    {
        var entries = JsonFileParser.Parse("""{"A":{"B":{"C":"val"}}}""");

        Assert.Single(entries);
        Assert.Equal("A__B__C", entries[0].Key);
    }

    [Fact]
    public void Parse_Array_FlattensWithIndex()
    {
        var entries = JsonFileParser.Parse("""{"Servers":["a","b","c"]}""");

        Assert.Equal(3, entries.Count);
        Assert.Equal("Servers__0", entries[0].Key);
        Assert.Equal("a", entries[0].Value);
        Assert.Equal("Servers__2", entries[2].Key);
        Assert.Equal("c", entries[2].Value);
    }

    [Fact]
    public void Parse_NonStringPrimitive_UsesRawText()
    {
        var entries = JsonFileParser.Parse("""{"Port":5432,"Enabled":true}""");

        Assert.Equal("5432", entries[0].Value);
        Assert.Equal("true", entries[1].Value);
    }

    [Fact]
    public void Parse_MalformedJson_Throws()
    {
        Assert.ThrowsAny<JsonException>(() => JsonFileParser.Parse("not-json"));
    }

    [Fact]
    public void Serialize_WritesFlatJsonObjectWithTrailingNewline()
    {
        var result = JsonFileParser.Serialize(
        [
            new ParsedEnvEntry("A", "1"),
            new ParsedEnvEntry("B", "two"),
        ]);

        Assert.EndsWith("\n", result);
        using var doc = JsonDocument.Parse(result);
        Assert.Equal("1", doc.RootElement.GetProperty("A").GetString());
        Assert.Equal("two", doc.RootElement.GetProperty("B").GetString());
    }
}
