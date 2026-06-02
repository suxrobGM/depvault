using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ConfigPushBody = DepVault.Cli.ApiClient.Api.Projects.Item.ConfigFiles.Push.PushPostRequestBody;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Encrypts a whole config file client-side (AES-256-GCM with the project DEK) and pushes the
/// ciphertext blob to the config-files endpoint. The server is zero-knowledge — it stores only the
/// encrypted blob, iv, and auth tag and never sees plaintext.
/// </summary>
internal sealed class ConfigFilePusher(IApiClientFactory clientFactory)
{
    /// <summary>
    /// Reads, encrypts, and uploads a single config file as one blob. App ownership and the
    /// environment slug are inferred from the file's repo-relative path and name.
    /// </summary>
    public async Task PushAsync(string projectId, DiscoveredFile file, byte[] dek, CancellationToken ct)
    {
        var bytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var isBinary = BinaryDetector.IsBinary(bytes);
        var (appPath, appName) = AppRootResolver.Resolve(GitUtils.FindRepoRoot(), file.RelativePath);
        var environmentSlug = EnvSlugResolver.Resolve(file.FileName);
        var (encryptedContent, iv, authTag) = VaultCrypto.EncryptBytes(bytes, dek);

        var body = new ConfigPushBody
        {
            AppPath = appPath,
            AppName = appName,
            RelativePath = file.RelativePath,
            Format = ResolveFormat(file.FileName),
            EnvironmentSlug = environmentSlug,
            EncryptedContent = encryptedContent,
            Iv = iv,
            AuthTag = authTag,
            FileSize = bytes.Length,
            IsBinary = isBinary,
        };

        var client = clientFactory.Create();
        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].ConfigFiles.Push.PostAsync(body, cancellationToken: ct));
    }

    /// <summary>
    /// Maps a config file name to the backend format identifier. Falls back to "env" for any
    /// dotenv-style file and "env" generally, since the env category is the dominant config form.
    /// </summary>
    private static string ResolveFormat(string fileName)
    {
        if (fileName.StartsWith(".env", StringComparison.OrdinalIgnoreCase))
        {
            return "env";
        }

        if (fileName.StartsWith("appsettings", StringComparison.OrdinalIgnoreCase) &&
            fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            return "appsettings.json";
        }

        if (fileName.StartsWith("secrets.", StringComparison.OrdinalIgnoreCase) &&
            (fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
             fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase)))
        {
            return "secrets.yaml";
        }

        if (fileName.Equals("config.toml", StringComparison.OrdinalIgnoreCase))
        {
            return "config.toml";
        }

        return "env";
    }
}
