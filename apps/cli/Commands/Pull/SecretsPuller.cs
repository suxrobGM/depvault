using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using Spectre.Console;
using VaultModel = DepVault.Cli.ApiClient.Api.Projects.Item.Vaults.Vaults;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Lists and downloads secret files for selected vaults.</summary>
public sealed class SecretsPuller(
    IApiClientFactory clientFactory,
    IOutputFormatter output)
{
    /// <summary>Downloads secret files for the selected vaults. Returns number of files written.</summary>
    public async Task<int> PullAsync(
        string projectId, List<VaultModel> vaults,
        string outputDir, byte[] dek, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var selectedVaultIds = vaults.Select(v => v.Id).ToHashSet();

        ApiClient.Api.Projects.Item.Secrets.SecretsGetResponse? files;

        try
        {
            files = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Fetching secret files...", async _ =>
                    await client.Api.Projects[projectId].Secrets.GetAsync(config =>
                    {
                        config.QueryParameters.Page = 1;
                        config.QueryParameters.Limit = 100;
                    }, ct));
        }
        catch (Exception ex)
        {
            output.PrintError($"Failed to list secret files: {ex.Message}");
            return 0;
        }

        var items = files?.Items?
            .Where(f => selectedVaultIds.Contains(f.VaultId))
            .ToList();

        if (items is null || items.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
            return 0;
        }

        var filesWritten = 0;

        foreach (var file in items)
        {
            try
            {
                var vault = vaults.FirstOrDefault(v => v.Id == file.VaultId);
                var secretsDir = ResolveSecretsDir(vault, outputDir);
                Directory.CreateDirectory(secretsDir);

                var filePath = Path.Combine(secretsDir, file.Name ?? $"secret-{file.Id}");

                var downloadResult = await client.Api.Projects[projectId].Secrets[file.Id!].Download
                    .GetAsync(cancellationToken: ct);

                if (downloadResult is null || string.IsNullOrEmpty(downloadResult.EncryptedContent))
                {
                    output.PrintError($"Failed to download {file.Name}: empty response");
                    continue;
                }

                var decryptedBytes = VaultCrypto.DecryptBytes(
                    downloadResult.EncryptedContent, downloadResult.Iv ?? "",
                    downloadResult.AuthTag ?? "", dek);
                await File.WriteAllBytesAsync(filePath, decryptedBytes, ct);

                output.PrintSuccess($"  {Path.GetRelativePath(outputDir, filePath)}");
                filesWritten++;
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to download {file.Name}: {ex.Message}");
            }
        }

        return filesWritten;
    }

    private static string ResolveSecretsDir(VaultModel? vault, string outputDir)
    {
        var dirPath = vault?.DirectoryPath;

        if (!string.IsNullOrEmpty(dirPath))
        {
            return Path.Combine(outputDir, dirPath, ".secrets");
        }

        return Path.Combine(outputDir, ".secrets");
    }
}
