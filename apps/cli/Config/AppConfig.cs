using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepVault.Cli.Config;

public sealed class AppConfigData
{
    [JsonPropertyName("server")]
#if DEBUG
    public string Server { get; set; } = "http://localhost:4000";
#else
    public string Server { get; set; } = "https://depvault.com";
#endif

    [JsonPropertyName("activeProjectId")]
    public string? ActiveProjectId { get; set; }

    [JsonPropertyName("activeProjectName")]
    public string? ActiveProjectName { get; set; }

    [JsonPropertyName("outputFormat")]
    public string OutputFormat { get; set; } = "table";
}

public interface IConfigService
{
    AppConfigData Load();
    void Save(AppConfigData config);
    string? Get(string key);
    bool Set(string key, string value);
}

public sealed class ConfigService : IConfigService
{
    private static readonly string configPath = Path.Combine(Constants.ConfigDir, "config.json");

    private AppConfigData? cached;

    public AppConfigData Load()
    {
        if (cached is not null)
        {
            return cached;
        }

        if (!File.Exists(configPath))
        {
            cached = new AppConfigData();
            return cached;
        }

        var json = File.ReadAllText(configPath);
        cached = JsonSerializer.Deserialize(json, ConfigJsonContext.Default.AppConfigData) ?? new AppConfigData();
        return cached;
    }

    public void Save(AppConfigData config)
    {
        Directory.CreateDirectory(Constants.ConfigDir);
        var json = JsonSerializer.Serialize(config, ConfigJsonContext.Default.AppConfigData);
        File.WriteAllText(configPath, json);
        cached = config;
    }

    public string? Get(string key)
    {
        return key.ToLowerInvariant() switch
        {
            "server" => Load().Server,
            "activeprojectid" or "project" => Load().ActiveProjectId,
            "outputformat" or "output" => Load().OutputFormat,
            _ => null
        };
    }

    public bool Set(string key, string value)
    {
        var config = Load();
        switch (key.ToLowerInvariant())
        {
            case "server":
                config.Server = value;
                break;
            case "activeprojectid" or "project":
                config.ActiveProjectId = value;
                break;
            case "outputformat" or "output":
                config.OutputFormat = value;
                break;
            default:
                return false;
        }

        Save(config);
        return true;
    }
}

[JsonSerializable(typeof(AppConfigData))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class ConfigJsonContext : JsonSerializerContext;
