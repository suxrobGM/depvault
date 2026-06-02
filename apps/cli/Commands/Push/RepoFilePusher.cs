using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using PushBody = DepVault.Cli.ApiClient.Api.Projects.Item.Files.Push.PushPostRequestBody;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.Files.Push.PushPostRequestBody_kind;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Encrypts a whole file client-side (AES-256-GCM with the project DEK) and pushes the ciphertext
/// blob to the unified files endpoint. The file's <see cref="FileCategory"/> maps to the RepoFile
/// kind: config files carry a format + environment slug, secret files carry a MIME type. The server
/// is zero-knowledge — it stores only the encrypted blob, iv, and auth tag and never sees plaintext.
/// </summary>
internal sealed class RepoFilePusher(IApiClientFactory clientFactory)
{
    /// <summary>
    /// Reads, encrypts, and uploads a single file as one blob. App ownership is inferred from the
    /// file's repo-relative path; config files additionally infer an environment slug from the name.
    /// </summary>
    public async Task PushAsync(string projectId, DiscoveredFile file, byte[] dek, CancellationToken ct)
    {
        var bytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var isBinary = BinaryDetector.IsBinary(bytes);
        var (appPath, appName) = AppRootResolver.Resolve(GitUtils.FindRepoRoot(), file.RelativePath);
        var (encryptedContent, iv, authTag) = VaultCrypto.EncryptBytes(bytes, dek);

        var isConfig = file.Category == FileCategory.Environment;

        var body = new PushBody
        {
            AppPath = appPath,
            AppName = appName,
            Kind = isConfig ? RepoFileKind.CONFIG : RepoFileKind.SECRET,
            RelativePath = file.RelativePath,
            EnvironmentSlug = EnvSlugResolver.Resolve(file.FileName),
            Format = isConfig ? ResolveFormat(file.FileName) : null,
            MimeType = isConfig ? null : ResolveMimeType(file.FileName),
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
                await client.Api.Projects[projectId].Files.Push.PostAsync(body, cancellationToken: ct));
    }

    /// <summary>
    /// Maps a config file name to the backend format identifier. Falls back to "env" generally,
    /// since the env category is the dominant config form.
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

    private static string ResolveMimeType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".json" => "application/json",
            ".plist" => "application/xml",
            ".yaml" or ".yml" => "application/x-yaml",
            ".pem" or ".key" => "application/x-pem-file",
            ".p12" or ".pfx" => "application/x-pkcs12",
            ".jks" or ".keystore" => "application/x-java-keystore",
            _ => "application/octet-stream"
        };
    }
}
