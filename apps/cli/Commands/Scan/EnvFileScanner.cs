using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using PushBody = DepVault.Cli.ApiClient.Api.Projects.Item.Files.Push.PushPostRequestBody;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.Files.Push.PushPostRequestBody_kind;

namespace DepVault.Cli.Commands.Scan;

/// <summary>
/// Uploads environment/config files to a project as encrypted blobs. Each file is encrypted
/// client-side (AES-256-GCM) with the project DEK before upload — the server is zero-knowledge and
/// only ever stores ciphertext. App + environment are inferred from the file's location and name.
/// </summary>
internal sealed class EnvFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    IApiClientFactory clientFactory,
    DekResolver dekResolver)
{
    private byte[]? cachedDek;

    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindEnvFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No environment files found.[/]");
            return;
        }

        PrintFileTree(files);

        AnsiConsole.MarkupLine("[yellow]Warning: These files may contain sensitive data. Review before pushing.[/]");
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to push (none selected by default)", files, f => f.RelativePath, false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped environment file push.[/]");
            return;
        }

        if (!await EnsureDekAsync(projectId, ct))
        {
            return;
        }

        AnsiConsole.WriteLine();

        foreach (var file in selected)
        {
            try
            {
                await UploadAsync(projectId, repoPath, file, ct);
                results.ConfigFilesPushed++;
                output.PrintSuccess($"Pushed {file.RelativePath}");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
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

    /// <summary>Encrypts a config file client-side and uploads the ciphertext as one blob.</summary>
    private async Task UploadAsync(
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

        var body = new PushBody
        {
            AppPath = appPath,
            AppName = appName,
            Kind = RepoFileKind.CONFIG,
            RelativePath = file.RelativePath,
            Format = DetectFormat(file.FileName),
            EnvironmentSlug = envSlug,
            EncryptedContent = ciphertext,
            Iv = iv,
            AuthTag = authTag,
            FileSize = fileBytes.Length,
            IsBinary = isBinary,
        };

        var client = clientFactory.Create();
        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].Files.Push.PostAsync(body, cancellationToken: ct));
    }

    /// <summary>Infers a coarse config format slug from the file name extension.</summary>
    internal static string DetectFormat(string fileName)
    {
        if (fileName.StartsWith(".env", StringComparison.OrdinalIgnoreCase))
        {
            return "env";
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".json" => "json",
            ".yaml" or ".yml" => "yaml",
            ".toml" => "toml",
            ".xml" or ".config" => "xml",
            ".ini" => "ini",
            _ => "env"
        };
    }

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} environment file(s)[/]");
        foreach (var f in files)
        {
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }
}
