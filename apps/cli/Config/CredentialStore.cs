using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepVault.Cli.Config;

public sealed class StoredCredentials
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = "";

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = "";

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }
}

public interface ICredentialStore
{
    StoredCredentials? Load();
    void Save(StoredCredentials credentials);
    void Delete();
}

public sealed class CredentialStore : ICredentialStore
{
    private static readonly string CredPath = Path.Combine(Constants.ConfigDir, "credentials.json");

    private StoredCredentials? _cached;
    private bool _loaded;

    public StoredCredentials? Load()
    {
        if (_loaded)
        {
            return _cached;
        }

        _loaded = true;

        if (!File.Exists(CredPath))
        {
            return _cached = null;
        }

        var json = File.ReadAllText(CredPath);
        var creds = JsonSerializer.Deserialize(json, CredentialJsonContext.Default.StoredCredentials);
        _cached = string.IsNullOrEmpty(creds?.AccessToken) ? null : creds;
        return _cached;
    }

    public void Save(StoredCredentials credentials)
    {
        Directory.CreateDirectory(Constants.ConfigDir);
        var json = JsonSerializer.Serialize(credentials, CredentialJsonContext.Default.StoredCredentials);
        File.WriteAllText(CredPath, json);
        _cached = credentials;
        _loaded = true;
    }

    public void Delete()
    {
        try { File.Delete(CredPath); }
        catch (FileNotFoundException) { }
        catch (DirectoryNotFoundException) { }
        _cached = null;
        _loaded = true;
    }
}

[JsonSerializable(typeof(StoredCredentials))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class CredentialJsonContext : JsonSerializerContext;
