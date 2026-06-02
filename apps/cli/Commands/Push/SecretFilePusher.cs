using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using SecretPushBody = DepVault.Cli.ApiClient.Api.Projects.Item.Secrets.Push.PushPostRequestBody;

namespace DepVault.Cli.Commands.Push;

/// <summary>
/// Encrypts a whole secret file client-side (AES-256-GCM with the project DEK) and pushes the
/// ciphertext blob to the secrets endpoint. The server is zero-knowledge — it stores only the
/// encrypted blob, iv, and auth tag and never sees plaintext.
/// </summary>
internal sealed class SecretFilePusher(IApiClientFactory clientFactory)
{
    /// <summary>
    /// Reads, encrypts, and uploads a single secret file as one blob. App ownership is inferred
    /// from the file's repo-relative path; the MIME type is inferred from its extension.
    /// </summary>
    public async Task PushAsync(string projectId, DiscoveredFile file, byte[] dek, CancellationToken ct)
    {
        var bytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var isBinary = BinaryDetector.IsBinary(bytes);
        var (appPath, appName) = AppRootResolver.Resolve(GitUtils.FindRepoRoot(), file.RelativePath);
        var (encryptedContent, iv, authTag) = VaultCrypto.EncryptBytes(bytes, dek);

        var body = new SecretPushBody
        {
            AppPath = appPath,
            AppName = appName,
            RelativePath = file.RelativePath,
            EncryptedContent = encryptedContent,
            Iv = iv,
            AuthTag = authTag,
            MimeType = ResolveMimeType(file.FileName),
            FileSize = bytes.Length,
            IsBinary = isBinary,
        };

        var client = clientFactory.Create();
        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].Secrets.Push.PostAsync(body, cancellationToken: ct));
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
