using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using SecretBody = DepVault.Cli.ApiClient.Api.Projects.Item.Secrets.Push.PushPostRequestBody;

namespace DepVault.Cli.Commands.Scan;

/// <summary>
/// Uploads secret files to a project as encrypted blobs. Each file is encrypted client-side
/// (AES-256-GCM) with the project DEK before upload — the server is zero-knowledge and only ever
/// stores ciphertext. App + environment are inferred from the file's location and name.
/// </summary>
internal sealed class SecretFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    IApiClientFactory clientFactory,
    DekResolver dekResolver)
{
    private byte[]? cachedDek;

    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindSecretFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
            return;
        }

        PrintFileTree(files);

        var selected = prompter.MultiSelect(
            "Select files to upload (none selected by default)", files, f => f.RelativePath, false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped secret file upload.[/]");
            return;
        }

        if (!await EnsureDekAsync(projectId, ct))
        {
            return;
        }

        foreach (var file in selected)
        {
            try
            {
                await UploadAsync(projectId, repoPath, file, ct);
                results.SecretFilesUploaded++;
                output.PrintSuccess($"Uploaded {file.RelativePath}");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to upload {file.RelativePath}");
            }
        }
    }

    /// <summary>Ensures the project DEK is resolved once and cached for the session.</summary>
    public async Task<bool> EnsureDekAsync(string projectId, CancellationToken ct)
    {
        if (cachedDek is not null)
        {
            return true;
        }

        var password = dekResolver.CollectVaultPassword();
        cachedDek = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await dekResolver.ResolveAsync(projectId, password, ct));

        return cachedDek is not null;
    }

    /// <summary>Encrypts a secret file client-side and uploads the ciphertext as one blob.</summary>
    public async Task UploadAsync(
        string projectId, string repoPath, DiscoveredFile file, CancellationToken ct)
    {
        if (cachedDek is null && !await EnsureDekAsync(projectId, ct))
        {
            throw new InvalidOperationException("Failed to resolve encryption key.");
        }

        var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var (appPath, appName) = AppRootResolver.Resolve(repoPath, file.RelativePath);
        var envSlug = EnvSlugResolver.Resolve(file.FileName);
        var isBinary = BinaryDetector.IsBinary(fileBytes);
        var (ciphertext, iv, authTag) = VaultCrypto.EncryptBytes(fileBytes, cachedDek!);

        var body = new SecretBody
        {
            AppPath = appPath,
            AppName = appName,
            RelativePath = file.RelativePath,
            EnvironmentSlug = envSlug,
            EncryptedContent = ciphertext,
            Iv = iv,
            AuthTag = authTag,
            MimeType = GetMimeType(file.FileName),
            FileSize = fileBytes.Length,
            IsBinary = isBinary,
        };

        var client = clientFactory.Create();
        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Uploading {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].Secrets.Push.PostAsync(body, cancellationToken: ct));
    }

    private static string GetMimeType(string fileName)
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

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} secret file(s)[/]");
        foreach (var f in files)
        {
            var size = new FileInfo(f.FullPath).Length;
            var sizeStr = size < 1024 ? $"{size} B" : $"{size / 1024.0:F1} KB";
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/] [grey]({sizeStr})[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }
}
