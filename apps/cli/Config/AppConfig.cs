using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepVault.Cli.Config;

public sealed class AppConfigData
{
    [JsonPropertyName("server")]
#if DEBUG
    public string Server { get; set; } = "http://localhost:4000/api";
#else
    public string Server { get; set; } = "https://depvault.com/api";
#endif

    [JsonPropertyName("activeProjectId")]
    public string? ActiveProjectId { get; set; }

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
    private static readonly string ConfigPath = Path.Combine(Constants.ConfigDir, "config.json");

    private AppConfigData? _cached;

    public AppConfigData Load()
    {
        if (_cached is not null)
        {
            return _cached;
        }

        if (!File.Exists(ConfigPath))
        {
            _cached = new AppConfigData();
            return _cached;
        }

        var json = File.ReadAllText(ConfigPath);
        _cached = JsonSerializer.Deserialize(json, ConfigJsonContext.Default.AppConfigData) ?? new AppConfigData();
        return _cached;
    }

    public void Save(AppConfigData config)
    {
        Directory.CreateDirectory(Constants.ConfigDir);
        var json = JsonSerializer.Serialize(config, ConfigJsonContext.Default.AppConfigData);
        File.WriteAllText(ConfigPath, json);
        _cached = config;
    }

    public string? Get(string key) => key.ToLowerInvariant() switch
    {
        "server" => Load().Server,
        "activeprojectid" or "project" => Load().ActiveProjectId,
        "outputformat" or "output" => Load().OutputFormat,
        _ => null
    };

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
