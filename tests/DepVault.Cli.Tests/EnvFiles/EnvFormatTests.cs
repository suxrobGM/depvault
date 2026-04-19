using DepVault.Cli.EnvFiles;

namespace DepVault.Cli.Tests.EnvFiles;

public class EnvFormatTests
{
    [Theory]
    [InlineData("appsettings.json", EnvFileFormat.Json)]
    [InlineData("Appsettings.Development.JSON", EnvFileFormat.Json)]
    [InlineData(".env", EnvFileFormat.Env)]
    [InlineData(".env.production", EnvFileFormat.Env)]
    [InlineData("config.yaml", EnvFileFormat.Env)]
    [InlineData("anything.toml", EnvFileFormat.Env)]
    public void Detect_ReturnsFormatByExtension(string fileName, EnvFileFormat expected)
    {
        Assert.Equal(expected, EnvFormat.Detect(fileName));
    }

    [Fact]
    public void Parse_EnvFormat_DispatchesToEnvParser()
    {
        var entries = EnvFormat.Parse("A=1\n", EnvFileFormat.Env);
        Assert.Single(entries);
        Assert.Equal("A", entries[0].Key);
    }

    [Fact]
    public void Parse_JsonFormat_DispatchesToJsonParser()
    {
        var entries = EnvFormat.Parse("""{"A":"1"}""", EnvFileFormat.Json);
        Assert.Single(entries);
        Assert.Equal("A", entries[0].Key);
    }

    [Fact]
    public void Serialize_EmptyEntries_ReturnsEmpty()
    {
        Assert.Equal("", EnvFormat.Serialize([], EnvFileFormat.Env));
        Assert.Equal("", EnvFormat.Serialize([], EnvFileFormat.Json));
    }

    [Fact]
    public void Serialize_EnvFormat_ProducesEnvContent()
    {
        var result = EnvFormat.Serialize(
            [new ParsedEnvEntry("A", "1")], EnvFileFormat.Env);
        Assert.Equal("A=1\n", result);
    }

    [Fact]
    public void Serialize_JsonFormat_ProducesJsonContent()
    {
        var result = EnvFormat.Serialize(
            [new ParsedEnvEntry("A", "1")], EnvFileFormat.Json);
        Assert.Contains("\"A\"", result);
        Assert.Contains("\"1\"", result);
    }
}
