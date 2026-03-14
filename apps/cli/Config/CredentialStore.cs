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
    private static readonly string credPath = Path.Combine(Constants.ConfigDir, "credentials.json");

    private StoredCredentials? cached;
    private bool loaded;

    public StoredCredentials? Load()
    {
        if (loaded)
        {
            return cached;
        }

        loaded = true;

        if (!File.Exists(credPath))
        {
            return cached = null;
        }

        var json = File.ReadAllText(credPath);
        var creds = JsonSerializer.Deserialize(json, CredentialJsonContext.Default.StoredCredentials);
        cached = string.IsNullOrEmpty(creds?.AccessToken) ? null : creds;
        return cached;
    }

    public void Save(StoredCredentials credentials)
    {
        Directory.CreateDirectory(Constants.ConfigDir);
        var json = JsonSerializer.Serialize(credentials, CredentialJsonContext.Default.StoredCredentials);
        File.WriteAllText(credPath, json);
        cached = credentials;
        loaded = true;
    }

    public void Delete()
    {
        try
        {
            File.Delete(credPath);
        }
        catch (FileNotFoundException)
        {
        }
        catch (DirectoryNotFoundException)
        {
        }

        cached = null;
        loaded = true;
    }
}

[JsonSerializable(typeof(StoredCredentials))]
[JsonSourceGenerationOptions(WriteIndented = true)]
internal partial class CredentialJsonContext : JsonSerializerContext;
